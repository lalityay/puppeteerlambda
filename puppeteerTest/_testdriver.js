/*
 * This is a utility file to help invoke and debug the lambda function. It is not included as part of the
 * bundle upload to Lambda.
 * 
 * Credentials:
 *  The AWS SDK for Node.js will look for credentials first in the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and then 
 *  fall back to the shared credentials file. For further information about credentials read the AWS SDK for Node.js documentation
 *  http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Credentials_from_the_Shared_Credentials_File_____aws_credentials_
 * 
 */

// Set the region to the locations of the S3 buckets
process.env['AWS_REGION'] = 'us-west-2'

var fs = require('fs');
var exports = require('./app');

// Load the sample event to be passed to Lambda. The _sampleEvent.json file can be modified to match
// what you want Lambda to process on.
var event = JSON.parse(fs.readFileSync('_sampleEvent.json', 'utf8').trim());

const chromium = require('chrome-aws-lambda');


var context = {};
context.done = function () {
    console.log("Lambda Function Complete");
}

exports.handler = async (event, context) => {
    let result = null;
    let browser = null;



    try {
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: false,
           // headless: chromium.headless,
        });

        let page = await browser.newPage();

        // Load the AWS SDK for Node.js
        var AWS = require('aws-sdk');
        // Set the region
        AWS.config.update({ region: 'us-east-2' });


        // Create an SQS service object
        var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });




        var fs = require('fs');

        var contents = fs.readFileSync('cookie.txt', 'utf8');
        console.log(contents);

        var headers = {
            'cookie': contents
        }
        await page.setExtraHTTPHeaders(headers);
        await page.setCacheEnabled(true);
        await page.setRequestInterception(true);

        page.on('request', interceptedRequest => {

            if (interceptedRequest.resourceType() === 'image' || interceptedRequest.resourceType() === 'stylesheet') {
                interceptedRequest.abort();
            }
            else {
                interceptedRequest.continue();
            }
        })

        var pageUrls = [
            "company/profile?id=100369",
            "company/stock?id=100369",
            "company/corporateStructure?Id=100369",
            "company/capitalOfferings?ID=100369",
            "company/rankingReport?ID=100369",
            "company/detailedRatesReport?ID=100369",
            "company/rateSpecials?ID=100369",
            "company/branchCompetitors?ID=100369"
        ]

        var manifestList = {};

        for (const pageUrl of pageUrls) {
            try {
                await page.goto("about:blank");
                var url = "https://platform.marketintelligence.spglobal.com/web/client?auth=inherit&overridecdc=1&#" + pageUrl + "&rbExportType=Pdf&kss=&ReportBuilderQuery=1";
                console.log("url:goto  " + pageUrl);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
                console.log("url:waitForSelector");
                await page.waitForSelector('div[name=\'reportManifest\']');
                console.log("url:$eval");
                result = await page.$eval('div[name=\'reportManifest\']', e => e.innerHTML);
                console.log("url:$eval,done");
                manifestList[pageUrl] = result;
            } catch (e) {
                console.error(e);
            }
            
        }


        var params = {
            DelaySeconds: 10,
            MessageAttributes: {
                "Page": {
                    DataType: "String",
                    StringValue: "cc"
                },
                "User": {
                    DataType: "String",
                    StringValue: "xyz@xyz.com"
                },
                "Id": {
                    DataType: "Number",
                    StringValue: "34354"
                }
            },
            MessageBody: JSON.stringify(manifestList),
            // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
            // MessageId: "Group1",  // Required for FIFO queues
            QueueUrl: "https://sqs.us-east-2.amazonaws.com/149687373251/outqueue"
        };

        sqs.sendMessage(params, function (err, data) {
            if (err) {
                console.log("Error", err);
            } else {
                console.log("Success", data.MessageId);
            }
        });
        //await page.goto(event.url || 'https://example.com');

        //result = await page.title();
    } catch (error) {
        return context.fail(error);
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }


    return context.succeed("ok");
};

const sendRes = (status, body) => {
    var response = {
        statusCode: status,
        headers: {
            "Content-Type": "text/html"
        },
        body: body
    };
    return response;
};

exports.handler(event, context);