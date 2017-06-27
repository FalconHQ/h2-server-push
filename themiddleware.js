const debug = require('debug')('spParser')
const fs = require('fs')
const extractor = require('html-static-asset-path-extractor')
const path = require('path')

let parsedObj = {};

const pushSingle = (res, resource) => {
    return new Promise((resolve, reject) => {
        const {filePath, contentType} = resource
        if (!res.push) reject(new Error('NO SPDY'))
        let pushStream = res.push('/' + filePath, {
            req: {'accept' : '**/*'},
            res: {'content-type' : contentType}
        }, (file) => resolve({ value: file, status: "resolved"}))
        debug('Path for createReadStream', path.join(__dirname, '../speedy-push', filePath))
        //make sure to switch '../speedy-push' to '../..' once using real node module

        fs.createReadStream(path.join(__dirname, '../speedy-push', filePath)).pipe(pushStream);

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
            debug("htmlPath", htmlPath, "parsedObj", parsedObj)
            if(parsedObj[htmlPath]) {

                debug("PATH EXISTS~~")
                let resources = parsedObj[htmlPath];
                const PromiseArr = resources.map(cur => pushSingle(res, cur))
                
                Promise.all(PromiseArr)
                .then((files)=> {  
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



module.exports = {spParser};