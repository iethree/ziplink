import React, { useState, useEffect} from 'react';
import {CSSTransition} from 'react-transition-group';
import './styles.sass';

function App(props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(0);
  const [expires, setExpires] = useState(14);
  const [serverData, setServerData] = useState(null);
  document.title = "ZipLink";

  return (
    <div className="screen">
      <div className="content">

        <h1 className="title is-1 has-text-centered">Zip <i className="fas fa-file-archive" /> link</h1>

        {loading===0 ?
          <Options  setName = {setName} setExpires={setExpires}/>
          : null
        }
        {loading<2 ?
          <Uploader name={name} expires = {expires} returnValues={setServerData} setLoading={setLoading}/>
          : null
        }
        {loading===2 && !serverData ? <Loading  /> : null}

        { serverData && serverData.error
            ? <Error error = {serverData.error} />
            : null
        }

        { serverData && !serverData.error
            ? <Results  link={serverData.link} password={serverData.password} expires={expires} />
            : null
        }
      </div>
    </div>
  );
}

function Options(props){
  return(
    <div className="options" id="options">
      <form>
        <label className="option-label"> Link Expiration </label>
        <input className="option-input" type="number" name="expires" placeholder = "14" min="1" max="90"
          onChange={(e)=>props.setExpires(e.target.value)}/>
        <label className="option-label"> Name </label>
        <input className="option-input" type="text" name="name" placeholder = "(optional)"
          onChange={(e)=>props.setName(e.target.value)}/>
      </form>
    </div>
  );
}
function Loading(props){
  return(
    <div className="loading" id="loading">
      <div> Zipping and Uploading </div>
      <div className="lds-ring">
        <div /> <div /> <div /> <div />
      </div>
    </div>
  );
}
function Results(props){
  const [copied, setCopied]=useState(false);
  function copyContent(e){
    var text = document.getElementById("copywell").innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
  }
  return(
    <div className="results" id="results">
      <div id="copywell" className = "copywell" onClick={copyContent}>
        download link: {props.link} <br/>
        password: {props.password} <br/>
        (link expires in {props.expires} days) <br/>
      </div>
      <div className='centered small'>
      {copied ? 'copied' : 'click above to copy'}
      <RefreshButton />

      </div>
    </div>
  );
}

function RefreshButton(props){
  return <button className="refresh" onClick={()=>document.location.reload()} > New ZipLink </button> ;
}


function Error(props){
  return(
    <div className="has-text-centered" id="results">
      <i className="far fa-frown" /> {props.error}
      <RefreshButton />
    </div>
  );
}

function Uploader(props){
  var [dragover, setDragover]=useState(true);
  var [loadingDocs, setLoadingDocs]=useState([]);
  var [progress, setProgress]=useState("0%");

  function fileInputClick(e){
    e.preventDefault();
    setDragover(true);
    document.getElementById('fileInput').click();
  }

  function onInputFile(e){
    setDragover(false);
    addFiles(e.target.files);
  }

  function onDrop(e){
    e.preventDefault();
    onNotHover();
    var validFiles=[];

    if(e.dataTransfer.items)// Use DataTransferItemList interface to access the file(s)
      for (var i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file'){
          console.log(e.dataTransfer.items[i]);
          validFiles.push(e.dataTransfer.items[i].getAsFile());
        }
    }
    else{ // Use DataTransfer interface to access the file(s)
      for (i = 0; i < e.dataTransfer.files.length; i++){
        console.log(e.dataTransfer.files[i].name);
        validFiles.push(e.dataTransfer.files[i]);
      }
    }
    if(validFiles.length){
      addFiles(validFiles);
    }
  }

  function addFiles(newFiles){

    //add to formdata object
    var uploadData = new FormData();
    var saveData = [];
    uploadData.append('name', props.name);
    uploadData.append('expires', props.expires);

    for(let f of newFiles){
      uploadData.append('file', f);
      saveData.push({
        name: f.name,
        progress: '0%',
      });
    }

    //create XHR object
    let xhr = new XMLHttpRequest(),
      method = 'POST',
      url = '/uploadDocs';

    xhr.open(method, url, true);
    props.setLoading(1);
    xhr.upload.onprogress = function (p) {
      let prog = Math.floor(p.loaded/p.total*100);
      if(prog>99){
        props.setLoading(2);
      }
      else{
        let printProg= prog+"%";
        setProgress(printProg);
      }
    };

    xhr.onload= function(e){
      var response = JSON.parse(e.target.response);
      //get link and password from server
      props.setLoading(3);
      props.returnValues(response);
    }

    setLoadingDocs(saveData);
    xhr.send(uploadData);
  }

  /** filter out the docs that are done uploading */
  function removeFiles(doneFiles){
    var goodFiles = loadingDocs;
    for (var removename of doneFiles) {
      goodFiles = goodFiles.filter((file)=>file.name!==removename);
    }
    setLoadingDocs(goodFiles);
  }
  function onHover(e){
    e.preventDefault();
    setDragover('dragover');
  }
  function onNotHover(){
    setDragover('');
  }

    return(
      <div id="fileDrop" className={"fileDrop "+dragover} onDragOver={onHover} onDrop={onDrop} onDragLeave={onNotHover} >
        <input id="fileInput" type="file" multiple="multiple" className="hidden" onChange={onInputFile}/>
        <Uploads inProgress={loadingDocs} fileInputClick={fileInputClick} progress={progress}/>
      </div>
    );
}
function Uploads(props){
  if(props.inProgress.length)
    return(
      <React.Fragment>
        <div className="has-text-left">
         {props.inProgress.map( (file)=>{ return(
            <div key={file.name} className='progContainer'>
              <div className='prog' style={{width:props.progress}} >
                <div className='proglabel'><Icon type="upload"/> {file.name}</div>
              </div>
            </div>
          ); })}
        </div>
      </React.Fragment>
    );
  else
    return (
      <div className="empty " onClick={props.fileInputClick} > <i className="fa fa-upload " /> Choose Files or Drag Them Here </div>
    );
}
function Icon(props){
  if(props.type==="working")
    return(
      <span className="icon has-text-warning"><i className="fas fa-spinner fa-loading"/></span>
    );
  else if(props.type==='queued')
    return(
      <span className="icon has-text-warning"><i className="fas fa-clock"/></span>
    );
  else if(props.type==='done')
    return(
      <span className="icon has-text-success"><i className="fas fa-check-circle"/></span>
    );
  else if(props.type==='download')
    return(
      <span className="icon has-text-success"><i className="fas fa-download"/></span>
    );
  else if(props.type==='upload')
    return(
      <span className="icon"><i className="fas fa-upload"/></span>
    );
  else if(props.type==='x')
    return(
      <span className="icon has-text-danger"><i className="fas fa-times-circle"/></span>
    );
  else {
    return null;
  }
}


function animate(element, animationName, callback) {
    const node = document.querySelector(element);
    if(!node)
      return;
    node.classList.add('animated', animationName)


    function handleAnimationEnd() {

        node.classList.remove('animated', animationName)
        node.removeEventListener('animationend', handleAnimationEnd)

        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd)
}

export default App;
