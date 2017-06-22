const debug = require('debug')('spParser')
const fs = require('fs')
const extractor = require('html-static-asset-path-extractor')
const path = require('path')

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

        // readFileAsync(filePath)
        // .then(file => {
        //     let pushStream = res.push('/' + filePath, {
        //         req: { 'accept' : '**/*'},
        //         res: {'content-type' : contentType}
        //     }, (file) => resolve({ value: file, status: "resolved"}))
        //     pushStream.end(file)
        // }, (error) => resolve({value:error, status: "rejected"}))
        // .catch(err => {
        //     debug('err', err)
        //     return Promise.reject(res);
        // })
    })
}

const spParser = (req, res, next) => {
    const sp = (htmlPath) => {
        extractor(htmlPath).then((resources) => {
        // debug('Resources', resources)
        // const resources =  [ {filePath: 'awesum.jpg', contentType: 'img/jpeg'}, {filePath: 'salt.jpg', contentType: 'img/jpeg'} ]
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

module.exports = spParser;