require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const chalk=require('chalk');
const shelljs=require('shelljs');
const datefns=require('date-fns');
const fs=require('fs');
const BoxSDK = require('box-node-sdk');

//Box Credentials
// var sdk = new BoxSDK({
//   clientID: 'CLIENT_ID',
//   clientSecret: 'CLIENT_SECRET'
// });
// var client = sdk.getBasicClient('DEVELOPER_TOKEN');
// var folderID;
// client.folders.create('0', 'Ziplink files').then((folder)=>{
//   folderID=folder.id;
// });
var client;

const tempPath ='docTemp/';

const multer = require('multer');
var upload = multer({ dest:tempPath });

// file upload/download
router.post('/uploadDocs', upload.array('file',99), function(req, res, next){

	console.log(chalk.blue(req.files.length+" files uploaded"));

  //zip files
  var fileList = req.files.map(file=>'"'+file.path+"'");
  var zipName = "zip_"+Date.now()+".zip";
  shell.exec(`zip -m ${zipName} ${fileList.join(' ')} `);

  //handle zip upload already

  //send to box
  var password = crypto.randomBytes(12).toString('base64');
  var expireDays = 14;
  var expires = datefns.addDays(new Date(), expireDays);

  var stream = fs.createReadStream(zipName);
  var folderID = "???????";
  console.log(chalk.blue('uploading: '+zipName));

  client.files.uploadFile(folderID, zipName , stream)
  .then(file => {
    client.files.update(file.id, {
        shared_link:{
          access:'open',
          password: password,
          unshared_at: expires
        }
    }).then(updatedFile=>{
        console.log(chalk.green('file ready: '+updatedFile.name));

        //send link and password back to client
        res.send({
          link: updatedFile.shared_link.download_url,
          password: password,
          expires: expireDays
        }).status(200);

        shell.rm(zipFile);
    });
  });
});

module.exports = router;
