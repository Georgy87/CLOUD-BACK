const fileService = require("../services/fileService");
const File = require("../models/File");
const User = require("../models/User");
const path = require('path');
const fs = require('fs');

class FileController {
    async createDir(req, res) {
        try {
            const { name, type, parent } = req.body;

            const file = new File({ name, type, parent, user: req.user.id });
            const parentFile = await File.findOne({ _id: parent });

            if (!parentFile) {
                file.path = name;
                await fileService.createDir(file);
            } else {
                file.path = `${parentFile.path}/${file.name}`;
                await fileService.createDir(file);
                parentFile.childs.push(file._id);
                await parentFile.save();
            }
            await file.save();
            return res.json(file);
        } catch (e) {
            console.log(e);
            return res.status(400).json(e);
        }
    }

    async getFiles(req, res) {
        try {
            const files = await File.find({
                user: req.user.id,
                parent: req.query.parent,
            });
            return res.json(files);
        } catch (e) {
            console.log(e);
            return res.status(500).json({ message: "Can not get files" });
        }
    }

    async uploadFile(req, res) {

        try {
            const file = req.files.file;
            const parent = await File.findOne({
                user: req.user.id,
                _id: req.body.parent,
            });

            const user = await User.findOne({ _id: req.user.id });

            if (user.usedSpace + file.size > user.diskSpace) {
                return res.status(400).json({message: 'There no space on the disk'});
            }

            user.usedSpace = user.usedSpace + file.size;

            let Path;

            if(parent) {
                Path = path.join(__dirname, `../files/${user._id}/${parent.path}/${file.name}`);
            } else {
                Path = path.join(__dirname, `../files/${user._id}/${file.name}`);
            }

            if (fs.existsSync(Path)) {
                return res.status(400).json({message: 'File already exist'});
            }

            file.mv(Path);

            const type = file.name.split('.').pop();
            let filePath = file.name;
            if(parent) {
                filePath = parent.path + '/' + file.name
            }
            console.log(filePath);
            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: filePath,
                parent: parent ? parent._id : null,
                user: user._id,
            })

            await dbFile.save();
            await user.save();

            return res.json(dbFile);

        } catch (e) {
            console.log(e);
            return res.status(500).json({ message: "Upload error" });
        }
    }

    async downloadFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id});
            const Path = path.join(__dirname, `../files/${req.user.id}/${file.name}`);

            if (fs.existsSync(Path)) {
                return res.download(Path, file.name);
            }
            return res.status(400).json({message: "Download error"});
        } catch (error) {
            res.status(500).json({message: "Download error"});
        }
    }

    async deleteFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id});
            if (!file) {
                return res.status(400).json({message: 'file not found'});
            }
            fileService.deleteFile(file);
            await file.remove();
            return res.json({message: 'File was deleted'});
        } catch (error) {
            console.log(error);
            return res.status(400).json({message: 'Dir is not empty'});
        }
    }
}

module.exports = new FileController();
