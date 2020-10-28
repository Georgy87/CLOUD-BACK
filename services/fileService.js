const fs = require('fs')
const File = require('../models/File')
const config = require('config')
const path = require('path')
const mkdirp = require('mkdirp');

class FileService {
    createDir(file) {
        // const filePath = `${config.get('filePath')}/${file.user}/${file.path}`
        const filePath = path.join(__dirname, `../files/${file.user}/${file.path}`)
        console.log(filePath)
        fs.mkdir(filePath, (e) => {
            console.log(e)
        })
        return new Promise(((resolve, reject) => {
            try {
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath)
                    return resolve({message: 'File was created'})
                } else {
                    return reject({message: "File already exist"})
                }
            } catch (e) {
                return reject({message: 'File error'})
            }
        }))
    }

}
module.exports = new FileService()