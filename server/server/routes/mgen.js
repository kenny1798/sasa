const express = require('express');
const router = express.Router();
const { Client, LocalAuth} = require('whatsapp-web.js');
const {phoneNumberFormatter} = require('../middlewares/WhatsAppFormatter')
const path = require('path');
const fs = require('fs');
const { mgenSessions, mgenleads, users } = require('../models');
const multer = require('multer');
const { validateToken } = require('../middlewares/AuthMiddleware');
require('dotenv').config();


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

router.get('/check-auth/:clientLink', validateToken, async (req,res) => {
    const username = req.user.username;
    const clientLink = req.params.clientLink;
    const session = await mgenSessions.findOne({where: {session_client:clientLink}});
    if (!session){
        res.json({status: ''})
    }else{
        if(session.session_status === 'created'){
        res.json({status: 'created'})
        }else if(session.session_status === 'ready'){
        const clientlink = session.session_client;
        res.json({status: 'ready', tick: 'yes', client:clientlink})
        }
        
    }
});

//Get Mgen Page
router.get('/get-data/:session_client', async (req,res) => {
    const session_client = req.params.session_client;
    const session = await mgenSessions.findOne({where: {session_client:session_client}});
    const username = session.username;
    const user = await users.findOne({where: {username:username}});
    try{
        res.json({session:session, user:user});
    }catch(error){
        res.json({error: error})
    }

});

//Send WhatsApp Message
router.post('/send-message/:session_client', async (req,res) => {

    const session_client = req.params.session_client;
    const {leadName, leadPhoneNumber} = await req.body;
    const checkNumber = JSON.stringify(leadPhoneNumber);
    const numberLength = checkNumber.length;
    const session = await mgenSessions.findOne({where: {session_client:session_client}});
    const sessionActive = await session.isActive;
    const addQueue = await session.submitQueue + 1;
    const currentQueue = await session.submitQueue;
    const message = await session.whatsapp_text;
    const username = await session.username;
    const lead = await mgenleads.findOne({where: {leadPhoneNumber:leadPhoneNumber}});
    const leadSession = await mgenleads.findOne({where: {session:session_client}});
    const user = await users.findOne({where: {username:username}});
    const plusContact = user.contacts + 1;

    if(!leadName || !leadPhoneNumber){
        res.json({error: "All fields cannot be blank"})
    }else if(numberLength<12 || numberLength>13){
        res.json({error: "WhatsApp number not valid"})
    }else if(lead && leadSession){
        res.json({error:"WhatsApp number already submitted"})
    }else{
        await mgenleads.create({
            user: username,
            session: session_client,
            leadName: leadName,
            leadPhoneNumber: leadPhoneNumber    
        }).then((response) => {
        if(response){
            res.json({status: "success", msg: "Your details submitted successfully", error: ""})
        users.update({contacts:plusContact}, {where: {username: username}}).then(() => {
            const client = new Client({
                authStrategy: new LocalAuth({clientId: username}),
                puppeteer: {headless: false,
                args: [ '--disable-gpu',
                '--disable-setuid-sandbox',
                '--no-sandbox'],
                executablePath: process.env.EXECUTE_PATH}
            }) 


        if(currentQueue == 0){

        mgenSessions.update({submitQueue: addQueue}, {where: {username:username}});

        client.initialize();
        
        client.on('ready', () => {
            const number = phoneNumberFormatter(leadPhoneNumber);
            client.sendMessage(number, message).then( async () => {
            if(addQueue == 1){
                mgenSessions.update({submitQueue: currentQueue}, {where:{username: username}}).then(async() =>{
                    const delayDestroy = () => {
                        client.destroy();

                        }
                    setTimeout(delayDestroy, 3000);
                    }) 
            }else if (addQueue > 1){
                const minusQueue = currentQueue - 1;
                mgenSessions.update({submitQueue: minusQueue}, {where:{username: username}}).then(async() =>{
                    const delayDestroy = () => {
                        client.destroy();
                        }
                    setTimeout(delayDestroy, 3000);
                    }) 
            }
                        }).catch(err => {
                            console.log(err);
                        });

        
                })

        }else if(currentQueue > 0){
        mgenSessions.update({submitQueue: addQueue}, {where: {username:username}});
        const delayMessage = () => {

        client.initialize();

        client.on('ready', () => {
                const number = phoneNumberFormatter(leadPhoneNumber);
                client.sendMessage(number, message).then(() => {
                if(addQueue == 1){
                    mgenSessions.update({submitQueue: currentQueue}, {where:{username: username}}).then(async() =>{
                        const delayDestroy = () => {
                        client.destroy();
                        }
                    setTimeout(delayDestroy, 3000);
                        }) 
                }else if (addQueue > 1){
                    const minusQueue = currentQueue - 1;
                    mgenSessions.update({submitQueue: minusQueue}, {where:{username: username}}).then(async() =>{
                        const delayDestroy = () => {
                            client.destroy();
                            }
                        setTimeout(delayDestroy, 3000);
                        }) 
                }
                
                    }).catch(err => {
                        console.log(err);
                    }) 
                })
        }
        const timer = 25000 * currentQueue;
        setTimeout(delayMessage, timer)    

        }
        })
            

        }
     
    })
    }

    });

router.post('/whatsapp-auth', validateToken, upload.single('form_image') , async (req,res) => {
    const username = req.user.username;
    const session_client = req.body.session_client;
    const form_title = req.body.form_title;
    const form_body = req.body.form_body;
    const whatsapp_text = req.body.whatsapp_text;
    const form_image = req.file.filename;
    try{
        mgenSessions.create({
            username:username,
            session_client: session_client,
            session_status: "created",
            form_title:form_title,
            form_body: form_body,
            form_image: form_image,
            whatsapp_text: whatsapp_text
        })
    }catch(error){
        res.json({error: error})
    }
});


router.get("/edit", validateToken, async (req, res) => {
    const username = req.user.username;
    const session = await mgenSessions.findOne({where: {username:username}});
    const formTitle = session.form_title;
    const formBody = session.form_body;
    const formImage = session.form_image;
    const wsText = session.whatsapp_text;
    const sessionClient = session.session_client
    try{
        res.json({formTitle: formTitle, formBody:formBody, formImage: formImage, wsText: wsText, sessionClient : sessionClient})
    }catch(error){
        res.json({error: error})
    }
    
    });

router.get("/delete/:clientLink", validateToken, async (req, res) => {
    const link = req.params.clientLink;
    const sessionPath = String(`./.wwebjs_auth/session-${link}`);
    const deletesession = fs.rmSync(sessionPath, {recursive: true});
        if(deletesession){
            res.json ({errmsg: 'Failed to delete session'})
            console.log("Unable to delete session");
        }else{
            mgenSessions.update({session_status: 'created'}, {where: {session_client:link}})
            res.json({msg: "Session deleted successfully"})
            console.log("Session deleted");
        }
        });

router.get("/session/delete/:clientLink", validateToken, async (req, res) => {
            const link = req.params.clientLink;
            const sessionPath = String(`./.wwebjs_auth/session-${link}`);
            const deletesession = fs.rmSync(sessionPath, {recursive: true});
                if(deletesession){
                    res.json ({errmsg: 'Failed to delete session'})
                    console.log("Unable to delete session");
                }else{
                    res.json({msg: "Session deleted successfully"})
                    console.log("Session deleted");
                }
                });

router.get("/getLeads/:session_client", validateToken, async (req, res) => {
    const session = req.params.session_client;
    const listOfLeads = await mgenleads.findAll({where: {session:session}});
    const count = listOfLeads.length;
    res.json({leads: listOfLeads, count: count});
        });

router.get('/getleads', validateToken, async (req,res) => {
    const username = req.user.username;
    const user = await users.findOne({where:{username:username}});
    const contacts = await user.contacts;
    res.json({contacts: contacts});
});

router.get('/getallcontacts', validateToken, async (req,res) => {
    const username = req.user.username;
    const contacts = await mgenleads.findAll({where:{user:username}});
    res.json(contacts);
});

router.get('/getSession', validateToken, async (req,res) => {
    const username = req.user.username;
    const session = await mgenSessions.findAll({where: {username:username}});
    res.json(session);
})

module.exports = router;
    