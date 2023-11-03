import React, { useState } from 'react';
import axios from '../api/axios';
import { useAuthContext } from '../hooks/useAuthContext';
import QRCode from 'react-qr-code';
import io from 'socket.io-client';
import LoadingImg from '../components/loading.gif';

const socket = io.connect(process.env.REACT_APP_SERVER);

function WhatsappAuth() {

    const {user} = useAuthContext();
    const [status, setStatus] = useState("");
    const [buttonHide, setButtonHide] = useState("");
    const [qrValue, setQrValue] = useState("");
    const [logMsg, setLogMsg] = useState("Press Generate QR to begin");
    const [loading, setLoading] = useState("");

    socket.on('qrvalue', (val) => {
        setQrValue(val)
      })
    
      socket.on('loading', (val) => {
        setLoading(val)
      })
    
      socket.on('btnhide', (val) => {
        setButtonHide(val)
      })
    
      socket.on('message', (msg) => {
        setLogMsg(msg)
      })

      const generateQR = () =>{
        setLoading('load');
          axios.get('/whatsapp-auth', {headers: {
            accessToken: user.token
          }})
      }


  return (
    <div className='App'>
    <div className="container mt-3">
      <div className="row justify-content-center text-center">
        <div className="col-lg-12">
        <h1 className="mt-4 header-title">CONNECT WHATSAPP</h1>
        </div>
        <div className='row justify-content-center'>
<div className="col-md-8">
      <div className="card text-center my-3">
        <div className="card-header">
          <p className="card-text">Message: {logMsg}</p>
            {!buttonHide ? (<button onClick={generateQR}> Generate QR </button>) : (<></>)}
        </div>
        <div className="card-body">
          {loading && (<img src={LoadingImg} alt='Loading' width='50' />)}
          {qrValue && (<QRCode size={300} bgColor='white' fgColor='black' value={qrValue} />)}
        </div>
      </div>
    </div>
    </div>
        </div>
        </div>
      </div>
  )
}

export default WhatsappAuth