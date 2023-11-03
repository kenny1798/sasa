const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config()
const port = parseInt(process.env.SERVER_PORT, 10);
const db = require('./models');
const fs = require('fs');
const fsx = require('fs-extra')
const https = require('https')
const http = require('http');
const {Server} = require("socket.io");
const multer = require('multer');
const path = require('path');
const { mgenSessions, mgenleads, users} = require('./models');
const { validateToken, validateAdmin } = require('./middlewares/AuthMiddleware');
const { Client, LocalAuth, Contact } = require('whatsapp-web.js');
var qrcode = require('qrcode-terminal');


app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static('form_images'))

const server = http.createServer(app);

const io = new Server(server, {
    cors:{
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT"],
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, 'form_images')
    },
    filename: (req, file, cb) =>{
        console.log(file)
        cb(null,"Mgen" + Date.now() + path.extname(file.originalname))
    }

});

const upload = multer({storage: storage});


// Routers
const usersRouter = require('./routes/user')
app.use("/api/user", usersRouter);

const validateRouter = require('./routes/validate');
app.use("/api/validate", validateRouter);

const mgenRouter = require('./routes/mgen');
app.use("/api/mgen", mgenRouter);

const msmartRouter = require('./routes/msmart');
app.use("/api/msmart", msmartRouter);

const adminRouter = require('./routes/admin');
app.use("/api/admin", adminRouter);

app.get('/', (req,res) => {
res.send("Hola")
})


app.put('/updateMgen', validateToken, upload.single('form_image') , async (req,res) => {
    const username = req.user.username;
    const session_client = req.body.session_client;
    const form_title = req.body.form_title;
    const form_body = req.body.form_body;
    const whatsapp_text = req.body.whatsapp_text;
    const session = await mgenSessions.findOne({where: {username:username}});
    const image = session.form_image
    let form_image;
    if(req.file){
    form_image = req.file.filename;
    }else{
    form_image = image;
    }
    
    try{
        mgenSessions.update({
            username:username,
            session_client: session_client,
            session_status: "ready",
            form_title:form_title,
            form_body: form_body,
            form_image: form_image,
            whatsapp_text: whatsapp_text
        }, {where: {username: username}}).then(() => {
            io.emit('update', 'updated')
            io.emit('status', 'ready')
        })
    }catch(error){
        io.emit('error', JSON.stringify(error))
    }
});

app.get('/whatsapp-auth/',validateToken, async (req,res) => {

    const username = req.user.username;
    
    const client = new Client({
            authStrategy: new LocalAuth({clientId: username}),
            puppeteer: {headless: true,
            args: [ '--disable-gpu',
             '--disable-setuid-sandbox',
             '--no-sandbox']}
                    });

    client.initialize();

    const checkPath =  String(`./.wwebjs_auth/session-${username}`);
    if(checkPath){
        const removePath = () =>{fs.rmSync(checkPath, {recursive: true});} 
        if (removePath){
            client.on('qr', (qr)  => {
                try{
                    io.emit('qrvalue', qr);
                    io.emit('message', 'QR Code is generated, scan now to get started.')
                    io.emit('btnhide', 'hide');
                    io.emit('loading', '');
                }
                catch (err){
                    io.emit({error: err.message})
                }      
                
            })
        }else{
            console.log('cant overwrite session')
        }

    }else{
        client.on('qr', (qr)  => {
            try{
                io.emit('qrvalue', qr);
                io.emit('message', 'QR Code is generated, scan now to get started.')
                io.emit('btnhide', 'hide');
                io.emit('loading', '');
            }
            catch (err){
                io.emit({error: err.message})
            }      
            
        })
    }            
            client.on('ready', () => {
                io.emit('qrvalue', '');
                io.emit('message', 'QR Scanned. Initializing authorized connection..' );
                io.emit('loading', 'load');
                    const checkAuth = () => {
                        const sessionPath = String(`./.wwebjs_auth/session-${username}`);
                    if(fs.existsSync(sessionPath)){
                        io.emit('message', 'Session Stored');
                        io.emit('loading', '');
                    const delay = () =>{
                        client.destroy();
                        io.emit('status','ready')
                    }
                    setTimeout(delay, 2000)
                    }
                    }
                    setTimeout(checkAuth, 3000)
                });
            
                
    });

app.get('/admin-auth', validateAdmin, async (req,res) => {

        const admin = process.env.ADMIN_LOGIN;
                    const client = new Client({
                            authStrategy: new LocalAuth({clientId:admin}),
                            puppeteer: {headless: true,
                            args: [ '--disable-gpu',
                            '--disable-setuid-sandbox',
                            '--no-sandbox']}
                        });
                
                        
                client.initialize();
            
                    client.on('qr', (qr)  => {
                        io.emit('qrvalue', qr);
                        io.emit('message', 'QR Code is generated, scan now to get started.')
                        io.emit('btnhide', 'hide');
                        io.emit('loading', ''); 
                               
                        
                    })
                    
                client.on('ready', () => {
                        io.emit('qrvalue', '');
                        io.emit('message', 'QR Scanned. Initializing authorized connection..' );
                        io.emit('loading', 'load');
                        const checkAuth = () => {
                            const sessionPath = String(`./.wwebjs_auth/session-${admin}`);
                        if(fs.existsSync(sessionPath)){
                            io.emit('loading', '');
                        const delay = () =>{
                            client.destroy();
                            io.emit('status','ready')
                        }
                        setTimeout(delay, 2000)
                        io.emit('message', 'Session Stored');
                        }
                        }
                        setTimeout(checkAuth, 3000)
                    });
                
                
        });

app.get('/admin/session/delete', validateAdmin, async (req,res) => {

 const admin = process.env.ADMIN_LOGIN;
 const sessionPath = String(`./.wwebjs_auth/session-${admin}`);
 const deletesession = fs.rmSync(sessionPath, {recursive: true});
    if(deletesession){
            res.json ({errmsg: 'Failed to delete session'})
            console.log("Unable to delete session");
        }else{
            res.json({msg: "Session deleted successfully"})
            console.log("Session deleted");
        }

});
 

// Start server
db.sequelize.sync().then(() => {
    server.listen(port, () =>{
                console.log("Server running on port " + port);
    })

})





