const attachmentData = require("./db.json");
const AWS = require ('aws-sdk')

let s3
let bucketName;

 async function initializeS3Connection() {
     const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
     const secretAccesKey = process.env.AWS_SECRET_ACCESS_KEY;

     const aws_region = "us-east-1";

    console.info("Connecting to S3 bucket...");
    console.info("Using AWS region " + aws_region);
     let config = {
         region: aws_region,
     };
     config.credentials = new AWS.SharedIniFileCredentials({
         profile: "my_profile",
     });

    AWS.config.update({
        accessKeyId,
        secretAccesKey,
        region: aws_region
    });
    s3 = new AWS.S3({ signatureVersion: "v4", apiVersion: "2006-03-01" });

    let buckets;
    bucketName = 'rehab-tracker-08012024';

    try {
        const data = await s3.listBuckets().promise();
        if (data.Buckets && data.Buckets.length > 0)
            console.info("Existing buckets detected: ", data.Buckets);
        buckets = data.Buckets;
    } catch (err) {
        console.error("Could not connect to s3");
        console.error(err);
        throw err;
    }

    if (!buckets || !buckets.map((bucket) => bucket.Name).includes(bucketName)) {
        console.info("Creating s3 bucket");
        try {
            const data = await s3.createBucket({ Bucket: bucketName }).promise();
            console.info("Env bucket created: " + bucketName);
        } catch (err) {
            console.error("Env bucket failed to create: " + err);
            throw err;
        }
    } else {
        console.info("Env bucket found: " + bucketName);
    }

    let corsRules;
    try {
        const data = await s3.getBucketCors({ Bucket: bucketName }).promise();
        if (data.CORSRules)
            console.info("Existing bucket CORS detected: ", data.CORSRules);
        corsRules = data.CORSRules;
    } catch (err) {
        if (err.statusCode === 404) {
            console.info("Existing bucket does not have CORS set.");
        } else {
            console.error("Could not connect to s3 to get CORS");
            console.error(err);
            throw err;
        }
    }

    const cors = {
        AllowedHeaders: ["*"],
        AllowedMethods: ["POST", "PUT", "GET", "DELETE"],
        AllowedOrigins: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000,
    };

    if (!corsRules || Object.is(corsRules["0"], cors)) {
        console.info("Setting s3 bucket CORS");
        try {
            const data = await s3
                .putBucketCors({
                    Bucket: bucketName,
                    CORSConfiguration: { CORSRules: [cors] },
                })
                .promise();
            console.info("Env bucket CORS set: " + bucketName);
        } catch (err) {
            console.error("Env bucket failed to set CORS: " + err);
            throw err;
        }
    } else {
        console.info("Env bucket cors are already correct: " + bucketName);
    }

    console.info(`Connected to S3 bucket: ${bucketName}`);

    return { s3: s3, bucketName: bucketName };
};

async function getData() {
    try {
        // get files
        let promises = [];
        attachmentData.map((file) => {

            
            // get file ext. og codebase uses mime npm package for this
            const extension = file.title.split('.')[1];
            
            console.log("attachmentData.map ~ file.id:", file.id);
            console.log("attachmentData.map ~ extension:", extension);

            promises.push(s3.getObject({
                Bucket: bucketName,
                Key: `tenants/e70b999a-385f-45d5-a63e-db434f4e69e7/projects/8af75728-0e61-43b2-9e2a-1cbf83fabbbf/attachments/files/2862d977-3280-4e54-8722-e30888019cb3.pdf`
                // Key: `tenants/e70b999a-385f-45d5-a63e-db434f4e69e7/projects/8af75728-0e61-43b2-9e2a-1cbf83fabbbf/attachments/files/${file.id}.${extension}`
            }).promise());
        })
        return await Promise.all(promises);

    } catch (error) {

        console.log("getData ~ error:", error);

    }
}
// /tenants/e70b999a-385f-45d5-a63e-db434f4e69e7/projects/8af75728-0e61-43b2-9e2a-1cbf83fabbbf/attachments/files/18d04647-da9d-48dd-bc94-1ed533ba9e4c.jpeg

module.exports = {initializeS3Connection, getData}