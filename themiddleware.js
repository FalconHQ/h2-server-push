const debug = require('debug')('spParser')
const fs = require('fs')
const extractor = require('html-static-asset-path-extractor')
const path = require('path')
const gcs = require('golombcodedsets-with-base64')

let parsedObj = {};

const readFileAsync = (filepath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
}

const pushSingle = (res, resource, rootPath) => {
    return new Promise((resolve, reject) => {
        const {filePath, contentType} = resource
        readFileAsync(path.join(__dirname, '../speedy-push', rootPath, filePath))
        .then(file => {
            let pushStream = res.push('/' + filePath, {
                request: {'accept' : '**/*'},
                response: {
                    'content-type' : contentType,
                    'cache-control': 'max-age=31536000, public'
                }
            }, (file) => resolve({ value: file, status: "resolved"}))
            pushStream.end(file)
        }, (error) => resolve({value:error, status: "rejected"}))
        .catch(err => {
            debug('err', err)
            return Promise.reject(res);
        })
        // const {filePath, contentType} = resource
        // if (!res.push) reject(new Error('NO SPDY'))
        // let pushStream = res.push('/' + filePath, {
        //     request: {'accept' : '**/*'},
        //     response: {
        //         'content-type' : contentType,
        //         'cache-control': 'max-age=31536000, public'
        //     }
        // }, (file) => resolve({ value: file, status: "resolved"}))
        // //make sure to switch '../speedy-push' to '../..' once using real node module
        // fs.createReadStream(path.join(__dirname, '../speedy-push', rootPath, filePath)).pipe(pushStream);

    })
}

const preParse = (folder) => {
  let htmlObj = fs.readdirSync(folder).filter(file => path.extname(file) === '.html' ? true : false);
  let mapped = htmlObj.map(paths => {
      //make sure to switch '../speedy-push' to  '../..' once using real node module from /node_modules folder
    return extractor(path.join(__dirname ,'../speedy-push', folder, paths));
  });
  Promise.all(mapped).then((paths => {
        parsedObj = paths.reduce((acc, resourcemap, currindex) => {
        acc[htmlObj[currindex]] = resourcemap;
        return acc;
    }, {})
    console.log('PARSEDOBJ', parsedObj)
  }))
}

const spParser = (folder) => {
    preParse(folder)

    return registerParser = (req, res, next) => {
        const sp = (htmlPath, folderPath = "") => {
            let cacheHash = req.cookies.cache || undefined;
            //if we have a resource map for the html file we want to push
            if(parsedObj[htmlPath]) {
                //array to store assets that arent cached yet
                let resources = []
                let setBuilder;
                //decide what to push based on cookie hash
                if(!cacheHash) {
                    resources = parsedObj[htmlPath];
                    setBuilder = new gcs.GCSBuilder(50, 1000)
                    resources.forEach((resource)=>{
                        setBuilder.add(resource.filePath)
                    })
                } else {
                    //create queriable set from cookie hash
                    let setQuery = new gcs.GCSQuery(cacheHash)
                    setBuilder = setQuery.toBuilder()
                    
                    //leave only missing assets 
                    parsedObj[htmlPath].forEach((resource)=>{
                       if(!setQuery.query(resource.filePath)) {
                            resources.push(resource)
                            setBuilder.add(resource.filePath)
                       }
                    })
                }

                debug("RESOURCES:", resources)
                const PromiseArr = resources.map(cur => pushSingle(res, cur, folderPath))
                
                Promise.all(PromiseArr)
                .then((files)=> { 
                    //update cookie with new cache hash
                    res.cookie('cache', setBuilder.toBase64()) 
                    const html = fs.createReadStream(path.join(folderPath, htmlPath));
                    html.pipe(res);
                })
                .catch((err)=> {
                    debug("error in streaming files:", err)
                    res.status(500);
                    res.send(err)
                })
            } 
        }
        res.sp = sp;
        next()
    }
}

module.exports = spParser;
