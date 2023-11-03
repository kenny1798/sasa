import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuthContext } from '../../hooks/useAuthContext';
import QRCode from 'react-qr-code';
import io from 'socket.io-client';
import LoadingImg from '../../components/loading.gif';
import { Link, useParams } from 'react-router-dom';


const socket = io.connect(process.env.REACT_APP_SERVER);



function MgenSForm() {

    const {session_client} = useParams();
    const {user} = useAuthContext();
    const [buttonHide, setButtonHide] = useState("");
    const [status, setStatus] = useState("ready");
    const [qrValue, setQrValue] = useState("");
    const [logMsg, setLogMsg] = useState("Press Generate QR to begin");
    const [loading, setLoading] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const [clientLink, setClientLink] = useState("");
    const [formTitle, setFormTitle] = useState("");
    const [formBody, setFormBody] = useState("");
    const [formImage, setFormImage] = useState("");
    const [wsText, setWsText] = useState("");
    const [showfile, setShowFile] = useState("");
    const mgenLink = 'http://localhost:3000/mgen/' + clientLink;
    const image = process.env.REACT_APP_SERVER + formImage;
    const [listOfLeads, setListOfLeads] = useState([]);
    const [contact, setContact] = useState("");
    const [showAlert, setShowAlert] = useState("");
    const [test, setTest] = useState("");

    socket.on('test', (val) => {
      setTest(val)
    })

    socket.on('qrvalue', (val) => {
        setQrValue(val)
      })
    
      socket.on('loading', (val) => {
        setLoading(val)
      })
    
      socket.on('link', (val) => {
        setClientLink(val)
      })
    
      socket.on('status', (msg) => {
        setStatus(msg)
      })
    
      socket.on('btnhide', (val) => {
        setButtonHide(val)
      })
    
      socket.on('message', (msg) => {
        setLogMsg(msg)
      })

      useEffect(()=> {
        const data = session_client;
        axios.get(`/api/mgen/check-auth/${data}` , {headers: {
          accessToken:user.token
        }}).then((response) => {
          if(!response.data.client){
            setStatus(response.data.status);
          }else{
            setStatus(response.data.status);
            setClientLink(response.data.client)
          }
          
        })
      }, [])

      useEffect(()=> {
        const data = session_client;
        axios.get(`/api/mgen/getLeads/${session_client}`, {headers: {
          accessToken:user.token
        }}).then((response) => {
          setListOfLeads(response.data.leads)
          setContact(response.data.count)
        })
      }, [])

      const showFileInput = () =>{
        setShowFile("show")
        }

        const updateForm = () =>{
          axios.get('/api/mgen/edit', {headers: {
            accessToken: user.token
          }}).then((response) => {
              setFormTitle(response.data.formTitle)
              setFormBody(response.data.formBody)
              setFormImage(response.data.formImage)
              setClientLink(response.data.sessionClient)
              setWsText(response.data.wsText)
          })
          setStatus("editForm")
        }

        const deleteForm = () => {
          axios.get(`/api/mgen/delete/${clientLink}`, {headers: {
            accessToken: user.token
          }}).then((response) => {
            if(response.data.error){
              setErrMsg(response.data.error)
            }else{
              setShowAlert("");
              setStatus("");
            }
          })
          }

          const cancelDelete = () => {
            setShowAlert("")
          }
          
          const handleAlert = () => {
              setShowAlert("true")
              }
          
          const editBack = () => {
            setStatus("ready");
          }

          const back = () => {
            setStatus("ready");
          }

          console.log(test);

          const submitUpdate = () =>{
            const formData = new FormData()
            formData.append('form_image', formImage)
            formData.append('session_client', clientLink)
            formData.append('form_title', formTitle)
            formData.append('form_body', formBody)
            formData.append('whatsapp_text', wsText)
            axios.put('/updateMgen', formData, {headers: {
              accessToken:user.token
            }})
          
          }

  return (
    <div className='App'>
    <div className="container mt-3">
      <div className="row justify-content-center text-center">
        <div className="col-lg-12">
        <h1 className="mt-4 header-title">M-GEN</h1>
        <p style={{fontSize:"1rem"}}>Increase your conversion rate with our automate WhatsApp message sender on lead form submit!</p>
        </div>
        </div>

        <div className='row justify-content-center text-center mb-2'>
    <div className="col-md-2">
    <div className="d-grid">
  <Link className='btn btn-outline-secondary' to='/mgenform'> ⬅️ Back</Link>
  </div>
  </div>
  </div>

      {status === 'editForm' &&(
  <div className='card'>
  <div className='row justify-content-center'>
    <div className="col-md-8">
    <form encType='multipart/form-data'>
      <div className='row g-3 my-3 justify-content-center'>
    <h4 className='text-center'>Create Your Form</h4>
  <div className="col-auto">
    <p className='link'>https://www.mirads.io/form/</p>
  </div>
  <div className="col-auto">
    <input type="text" className="form-control" defaultValue={clientLink} placeholder="e.g: miradsmarketing" onChange={(event) => {setClientLink(event.target.value)}} required readOnly />
  </div>
  </div>
  <div className='container'>
  <div className='row justify-content-center'>
  <div className='col-md-8'>
          <label><strong>Form Title</strong> - Your lead gen form title</label>
          <input type="text" className='form-control shadow-none'  defaultValue={formTitle} onChange={(event) => {setFormTitle(event.target.value)}} required maxLength="254" />
          <label className='mt-5'><strong>Form Body</strong> - Your lead gen form body</label>
          <textarea type="textarea" className='form-control shadow-none' defaultValue={formBody} onChange={(event) => {setFormBody(event.target.value)}} required maxLength="254" />
          <label className='mt-5'><strong>Image</strong> - Your lead gen form image</label><br/>
          <a href='#' onClick={showFileInput}>Change Picture</a>
          {showfile && (<input type="file" className='form-control shadow-none' onChange={(event) => {setFormImage(event.target.files[0])}} required />)}
          <img src={image} alt='none'  className='mgen-image-header'/>
          <label className='mt'><strong>WhatsApp Text</strong> - Your auto WhatsApp text</label>
          <textarea type="textarea" className='form-control shadow-none' defaultValue={wsText} onChange={(event) => {setWsText(event.target.value)}} required maxLength="254" />
          <div className="d-grid my-3 gap-2">
          <button className='btn btn-primary mt-2' onClick={submitUpdate}>Submit Form</button>
          <button className='btn btn-outline-secondary mt-2'onClick={editBack}>Back</button>
          </div>
          
          
  </div>
  </div>
  </div>
</form>
</div>
    </div>
    </div>
    )}


{status === 'ready' &&(

<div className='row justify-content-center'>
<div className="col-md-8">
      <div className="card text-center my-3">
        <div className="card-header">
        <p className="card-text">✅Your link is ready: <a href={mgenLink}>{mgenLink}</a></p>
        </div>
        {showAlert && (<div class="alert alert-warning" role="alert">
        Are you sure you want to delete current form? <button className='btn btn-sm btn-danger' onClick={deleteForm}>DELETE</button> <button className='btn btn-sm btn-secondary' onClick={cancelDelete}>Cancel</button>
</div>)}
        
        <div className="card-body">
          <div className='row justify-content-center'>
          <div className='col-md-3 my-2'><button className='btn btn-success' onClick={updateForm}>Update Form</button></div>
          <div className='col-md-3 my-2'><button className='btn btn-danger mx-2' onClick={handleAlert} >Delete Form</button></div>
          </div>
        </div>
      </div>
    </div>

    <div className="col-md-8">
    <div className="card text-center mb-5">
    <div className="card-header">
      Contact: <strong>{contact}</strong>
    
        </div>
        <table class="table table-hover">
  <thead>
    <tr>
      <th scope="col">#</th>
      <th scope="col">Name</th>
      <th scope="col">Phone Number</th>
      <th scope="col">Date</th>
    </tr>
  </thead>
    {listOfLeads.map((value, key) =>{
      const adjustedDate = new Date (value.createdAt);

      return (
  <tbody>
  
    <tr>
      <th scope="row">{key+1}</th>
      <td>{value.leadName}</td>
      <td>{value.leadPhoneNumber}</td>
      
      <td>{adjustedDate.toLocaleString("MYT")}</td>
    </tr>
    
  </tbody>)
    })}
    </table>
    </div>

  </div>
  </div>

  
  
)}


    </div>
    </div>
    
  )
}

export default MgenSForm