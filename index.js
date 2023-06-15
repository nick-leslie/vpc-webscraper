const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const fsNormal = require('fs');
const http = require('http');
const request = require("request-promise-native");
const PrismaClient = require('@prisma/client');
const {connect} = require("puppeteer");
const { parse } = require("csv-parse");


let url = "https://digital.wpi.edu/catalog?f%5Bcenter_sim%5D%5B%5D=Venice%2C+Italy+Project+Center+-+IQP&f%5Bmember_of_collection_ids_ssim%5D%5B%5D=iqp&locale=en&per_page=100&search_field=all_fields&sort=score+desc%2C+system_create_dtsi+desc&view=list";
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const prisma = new PrismaClient.PrismaClient();
const iqpMainList = [];
let matchCount = 0;
let newer
let totalCount= 0;
let over1999 = 0;


(async () => {
    let projectArray =  fsNormal.createReadStream("./Copy of VPC Master Project List - WPI VPC Project List.csv")
        .pipe(parse({ delimiter: ",", from_line: 2 }))
        .on("data", function (row) {
            let iqp = {
                title:row[0],
                term:row[1],
                year:parseInt(row[2]),
                report:row[3],
                wpiOnly:row[4],
                sponsors:row[5],
                authors:row[6],
                coAdvisors:row[7],
                topics:row[8],
                webcite:row[10],
            }
            iqpMainList.push(iqp)
        }).on("end", () => {
            //console.log(results)
        })
    await wait(5000);
    for (let projects = 0; projects < iqpMainList.length; projects++) {
        if(iqpMainList[projects].year >= 1999) {
            over1999 +=1;
        }
    }
    console.log(over1999)
    //console.log(iqpMainList);
    let width = 2000;
    let height = 2000;
    const browser = await puppeteer.launch({ headless: true,defaultViewport: null,args:[`--window-size=${width},${height}`]})
    const page = await browser.newPage();
    const navigationPromise = page.waitForNavigation()
    await page.goto(url);
    await navigationPromise
    let loop = true;
    while (loop) {
        await grabAllLinks(page)
        loop = await goNext(page);
    }
    await browser.close()
    console.log(`${matchCount}/${totalCount} iqps found`);
})().finally(async () => {
    await prisma.$disconnect();
})

async function grabAllLinks(page) {
    let hrefs = await page.evaluate(() => {
        return Array.from(document.getElementsByTagName('a'), a => a.href);
    });
    hrefs = hrefs.filter(function (str) { return str.includes("concern/student_works"); });
    hrefs = hrefs.filter((item, index) => hrefs.indexOf(item) === index);
    for (let i = 0; i < hrefs.length; i++) {
       await grabFile(page,hrefs[i]);
    }
}
async function goNext(page) {
    await page.goto(url)
    let nextLink = await page.evaluate(() => {
        let elements = document.getElementsByTagName('a');
        let textInput = Array.from(document.getElementsByTagName('a'), a =>{
            if(a.text.includes("Next")) {
               return a.href
            }
        });
        return textInput.filter(el => {
            if(el != null) {
                return el;
            }
        });
    })
    await page.goto(nextLink[0]);
    if(nextLink[0] !== url) {
        console.log("going to next page")
        url = page.url();
        return true;
    }
    return false;
}
async function grabFile(page,link) {
    await page.goto(link,{timeout:0});
    let title = await page.evaluate(() => {
        return Array.from(document.getElementsByClassName('title-with-badges'), element => element.children.item(0).textContent);
    });

    let pdfLink = await page.evaluate(()=>{
       return document.getElementById("file_download").href
    });

    let description = await page.evaluate(()=> {
        return document.getElementsByClassName("work_description").item(0).textContent;
    })
    let creators = await textContentFromClass("attribute-creator",page);

    let sponsors = await textContentFromClass("attribute-sponsor",page);

    let advisors = await textContentFromClass("attribute-advisor",page);

    let year  = await  textContentFromClass("attribute-year",page);

    for (let projects = 0; projects < iqpMainList.length; projects++) {
        if(iqpMainList[projects].year >= 1999) {
            if(title[0].toLowerCase() === iqpMainList[projects].title.toLowerCase()) {
                matchCount += 1;
            }
        }
    }
    totalCount+=1;

    let create = await prisma.project.create({
        data:{
            title:title[0],
            description:description,
            tags:["iqp"],
            img:"https://www.veniceprojectcenter.org/assets/6-7319af239c15b9deb2fc4040ce9eb2b610185ab1c17912c770b43046dafc73f8.jpg",
            dataurls:pdfLink,
            iqp_team: {
                create: {
                    team: creators,
                    sponsors: sponsors,
                    advisors: advisors
                },
            },
            year: parseInt(year),
            type: "IQP"
        }
    })
    console.log("added " + title[0]);
    //await download(pdfLink,title[0]);
}
async function download(url, filename,fileType) {
    try {
        const fileBuffer = await request.get({
            url: url,
            encoding: null,
            rejectUnauthorized: false
        });
        await fs.writeFile("./iqps/" + filename + fileType, fileBuffer);
        console.log("downloaded " + filename)
    } catch (err) {
        console.log("failed to download" + filename);
    }
}
//attribute-sponsor"
async function textContentFromClass(className,page) {
   return  await  page.evaluate(({className}) => {
        return Array.from(document.getElementsByClassName(className),(item) => {
            return item.textContent
        })
    },{className})
}

async function grabFromProjectPage(page,iqp) {
    await page.goto("https://veniceprojectcenter.org/vpc/projects",{
        timeout:0,
        waitUntil:['domcontentloaded']
    });
    page.type('input[name="projects"]',iqp)
    await wait(5000);
}

async function writeArrayToFile(arr) {
    for (let i = 0; i < arr.length; i++) {
        try {
            const content = arr[i];
            await fs.appendFile('./links.txt', content);
            await fs.appendFile('./links.txt', "\n");
        } catch (err) {
            console.log(err);
        }
    }
}