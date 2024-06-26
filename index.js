const express = require("express");
require('dotenv').config();
const axios = require("axios");
const archiver = require("archiver");
const stream = require('stream');
const fs = require('fs');
const app = express();
const port = 8000;

// Load attachment data from db.json
const attachmentData = require("./db.json");
const { initializeS3Connection, getData } = require("./awsMethods");

initializeS3Connection(); 


app.get("/", (req, res) => {
    res.send("Hi from Shubham");
});

app.get("/atch", async (req, res) => {
    const startTime = Date.now(); 
    try {
        const zip = archiver('zip', {
            zlib: { level: 9 } 
        });

        res.attachment('attachments.zip');
        zip.pipe(res);

        // Fetch all attachments concurrently
        const attachmentPromises = attachmentData.map(attachment => 
            axios({
                url: attachment.getUrl,
                responseType: 'stream'
            }).then(response => {
                return { data: response.data, title: attachment.title };
            })
        );

        const attachments = await Promise.all(attachmentPromises);

        attachments.forEach(attachment => {
            zip.append(attachment.data, { name: attachment.title });
        });

        zip.finalize();

        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000; 
        console.log(`ZIP file creation took ${timeTaken.toFixed(2)} seconds`);
        console.log(`Number of attachments: ${attachments.length}`);
    } catch (error) {
        console.error("Error downloading:", error);
        res.status(500).send("Error downloading attachments");
    }
});

app.get("/attach2", async (req, res) => {
    const startTime = Date.now();
    try {

        const zip = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment('attachments.zip');
        zip.pipe(res);


        // // Fetch all attachments concurrently
        // const attachmentPromises = attachmentData.map(attachment => 
        //     axios({
        //         url: attachment.getUrl,
        //         responseType: 'stream'
        //     }).then(response => {
        //         return { data: response.data, title: attachment.title };
        //     })
        // );

        // const attachments = await Promise.all(attachmentPromises);


        const attachments = await getData();

        console.log("app.get ~ attachments:", attachments);


        attachments.forEach((attachment, index) => {
            // zip.append(attachment.Body, { name: `attachment${index}` });
            zip.append(fs.createReadStream(attachment.Body, { name: `attachment` }));
        });
        zip.on('error', function (err) {
            throw err;
        });

        zip.finalize();

        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        console.log(`ZIP file creation took ${timeTaken.toFixed(2)} seconds`);
        console.log(`Number of attachments: ${attachments.length}`);
    } catch (error) {
        console.error("Error downloading:", error);
        res.status(500).send("Error downloading attachments");
    }
});


app.listen(port, () => {
    console.log(`Server is live on port ${port}`);
});
