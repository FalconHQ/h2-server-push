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
        debug('Path for createReadStream', path.join(__dirname, '../..', filePath))
        fs.createReadStream(path.join(__dirname, '../..', filePath)).pipe(pushStream);

    })
}

const spParser = (req, res, next) => {
    const sp = (htmlPath) => {
        extractor(htmlPath).then((resources) => {
        const PromiseArr = resources.map(cur => pushSingle(res, cur))
        debug('PromiseArr', PromiseArr)

        Promise.all(PromiseArr)
        .then((files)=>{
            const html = fs.createReadStream(htmlPath);
            html.pipe(res);
        })
        .catch((err)=>{
            debug("error in streaming files:", err)
            res.status(500);
            res.send(err)
        })
    })
    }
    //add method
    res.sp = sp;
    next()
}

const preParse = (folder) => {
  let htmlObj = fs.readdirSync(folder).filter(file => path.extname(file) === '.html' ? true : false);
  let mapped = htmlObj.map(paths => {
    return extractor(path.join(__dirname , '../..' , folder, paths));
  });
  Promise.all(mapped).then((paths => {
        parsedObj = paths.reduce((acc, resourcemap, currindex) => {
        acc[htmlObj[currindex]] = resourcemap;
        return acc;
    }, {})
    console.log('PARSEDOBJ', parsedObj)
  }))
}

module.exports = {preParse, spParser};