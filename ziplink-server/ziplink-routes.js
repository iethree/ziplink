const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const chalk=require('chalk');
const shell=require('shelljs');
const datefns=require('date-fns');
const fs=require('fs');
const BoxSDK = require('box-node-sdk');

//Box Credentials
var config =JSON.parse(fs.readFileSync('.env'));
const sdk = BoxSDK.getPreconfiguredInstance(config);
//const client = sdk.getAppAuthClient('enterprise', config.enterpriseID);
const client = sdk.getAppAuthClient('user', config.userID);

// const sdk = new BoxSDK({
//   clientID: config.boxAppSettings.clientID,
//   clientSecret: config.boxAppSettings.clientSecret
// });
//const client = sdk.getBasicClient('6EQrIwtEm8JzWyLoYC5kOSmiudOxYV2A');

// client.folders.create('0', 'Ziplink files').then((folder)=>{
//   folderID=folder.id;
// });

const tempPath ='docTemp/';
const savePath ='uploads/';

const multer = require('multer');
var upload = multer({ dest:tempPath });

// file upload/download
router.post('/uploadDocs', upload.array('file',99), async function(req, res, next){

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

  var zipped = await zipFiles(zipName, fileList).catch(printerr);

  var expireDays = req.body.expires || 14;
  var expires = datefns.addDays(new Date(), expireDays);

  if(zipped)
    var result = await uploadZip(zipName, expires).catch(printerr);
  else
    var result = false;
  //send link and password back to client
  res.send(result).status(200);
  //handle zip upload already

    /* WIP */

  //send to box

});

function zipFiles(zipName, fileList){
  return new Promise((resolve, reject)=>{
    let cmd=`zip -m ${zipName} ${fileList.join(' ')} `;
    console.log(cmd);

    shell.exec(`zip -m ${zipName} ${fileList.join(' ')} `, {silent: false}, (code, stdout, stderr)=>{

      if(code===0){
        console.log(chalk.green('zipped ', zipName));
        resolve(true);
      }
      else{
        console.log(chalk.red('unexpected exit code on zipping ', zipName));
        reject(false)
      }
    });
  });
}
function testUpload(zipName, expires){
  return new Promise((resolve, reject)=>{
    setTimeout(()=>{
      resolve({
        link: 'fakelink',
        password: 'password1234',
        expires: 14
      }, 3000);
    });
  });
}

function uploadZip(zipName, expires){
  return new Promise((resolve, reject)=>{
    var password = crypto.randomBytes(12).toString('base64');
    var stream = fs.createReadStream(zipName);

    var folderID = '77412689480';
    var fileName = zipName.replace(savePath, '');
    console.log(chalk.green('uploading: '+zipName));
    client.files.uploadFile(folderID, fileName, stream)
    .then(file => {
      console.log(chalk.green('updating: '+zipName));
      client.files.update(file.entries[0].id, {
          shared_link:{
            access:"open",
            password: password,
            unshared_at: expires,
            permissions: {
              "can_download": true
            }
          }
      }).then(updatedFile=>{
          console.log(chalk.green('completing: '+zipName));
          console.log(chalk.green('file ready: '+updatedFile.name));
          shell.rm(zipFile);

          resolve({
            error: null,
						link: updatedFile.shared_link.download_url,
            password: password,
            expires: expires
          });
      }).catch((err)=>sendErr("Box Sharing Error", err, resolve));
    }).catch((err)=>sendErr("Box Upload Error", err, resolve));
  });
}

function printerr(err){
  console.log(chalk.magenta(err));
}

function sendErr(type, err, resolve){
	printerr(err);
	resolve({error: type});
}

module.exports = router;
