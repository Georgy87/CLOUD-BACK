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
            console.log(parentFile);

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
        console.log(req)
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
            console.log(parent);

            if (fs.existsSync(Path)) {
                return res.status(400).json({message: 'File already exist'});
            }

            file.mv(Path);

            const type = file.name.split('.').pop();

            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: parent.path,
                parent: parent._id,
                user: user._id
            })

            await dbFile.save();
            await user.save();

            return res.json(dbFile);

        } catch (e) {
            console.log(e);
            return res.status(500).json({ message: "Upload error" });
        }
    }
}

module.exports = new FileController();
