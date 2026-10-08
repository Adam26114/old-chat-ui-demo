import {useState} from 'react'
import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'

import ChatBot from './components/ChatBot';

function App() {
    const [count, setCount] = useState(0);

    const login = () => {
        const auth_token = prompt("Auth token");
        if(auth_token) {
            document.dispatchEvent(new CustomEvent("myroompass/login", {
                detail: {
                    auth_token: auth_token
                }
            }));
        }
    };

    const app_key       = import.meta.env.VITE_APP_KEY;
    const customer_id   = import.meta.env.VITE_CUSTOMER;
    const property_code = import.meta.env.VITE_PROPERTY;
    const booking_link  = import.meta.env.VITE_BOOKING_LINK;
    const login_link    = import.meta.env.VITE_LOGIN_LINK;
    const payment_link  = import.meta.env.VITE_PAYMENT_LINK;
    const chatbox_title = import.meta.env.VITE_CHATBOX_TITLE;
    const avatar        = import.meta.env.VITE_AVATAR;

    const urlParams = new URLSearchParams(window.location.search);
    const x_auth_token = urlParams.get("x_auth_token") || "";

    return (
        <>
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    {/* <img src={viteLogo} className="logo" alt="Vite logo"/> */}
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo"/>
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
                <p>
                    <button onClick={login}>LOG IN</button>
                </p>
            </div>
            <ChatBot
                app_key={app_key}
                customer_id={customer_id}
                property_code={property_code}
                booking_link={booking_link}
                login_link={login_link}
                payment_link={payment_link}
                chatbox_title={chatbox_title}
                avatar={avatar}
                x_auth_token={x_auth_token}
                />
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </>
    )
}

export default App;
