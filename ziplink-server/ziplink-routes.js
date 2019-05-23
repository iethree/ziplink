const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const chalk=require('chalk');
const shelljs=require('shelljs');
const datefns=require('date-fns');
const fs=require('fs');
const BoxSDK = require('box-node-sdk');

//Box Credentials
var config =JSON.parse(fs.readFileSync('.env'));

//const sdk = BoxSDK.getPreconfiguredInstance(config);
const sdk = new BoxSDK({
  clientID: config.boxAppSettings.clientID,
  clientSecret: config.boxAppSettings.clientSecret
});
//const client = sdk.getAppAuthClient('enterprise', config.enterpriseID);
const client = sdk.getBasicClient('uGqM7V5JUpuoxRvxuAFMaumEkwBdgNOu');

// client.folders.create('0', 'Ziplink files').then((folder)=>{
//   folderID=folder.id;
// });

const tempPath ='docTemp/';
const savePath ='uploads/';

const multer = require('multer');
var upload = multer({ dest:tempPath });

// file upload/download
router.post('/uploadDocs', upload.array('file',99), function(req, res, next){

	console.log(chalk.blue(req.files.length+" files uploaded"));
  var fileList=[];
  //zip files
  for(let file of req.files){
    try{
      fs.renameSync(file.path, savePath+file.originalname);
      fileList.push('"'+savePath+file.originalname+'"');
    }
    catch(e){
      console.log(chalk.red(e));
    }
  }

  var zipName = req.body.name ? savePath+req.body.name+".zip" : savePath+"zip_"+Date.now()+".zip";
  let cmd=`zip -m ${zipName} ${fileList.join(' ')} `;
  console.log(cmd);
  shell.exec(`zip -m ${zipName} ${fileList.join(' ')} `, {silent: false}, (code, stdout, stderr)=>{
    if(code===0) console.log(chalk.green('zipped'));
    else console.log(chalk.red('unexpected exit code on zipping'));

    var password = crypto.randomBytes(12).toString('base64');
    var expireDays = req.body.expires || 14;
    var expires = datefns.addDays(new Date(), expireDays);

    var stream = fs.createReadStream(savePath+zipName);
    var folderID = '77412689480';
    console.log(chalk.blue('uploading: '+zipName));

    client.files.uploadFile(folderID, zipName, stream)
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

  //handle zip upload already

    /* WIP */

  //send to box

});

module.exports = router;
