import GuestPage from "./components/hotel/guest-page";

function App() {
    const query = new URLSearchParams(window.location.search);
    return <GuestPage chatbotProps={{
        app_key: import.meta.env.VITE_APP_KEY,
        customer_id: import.meta.env.VITE_CUSTOMER,
        property_code: import.meta.env.VITE_PROPERTY,
        booking_link: import.meta.env.VITE_BOOKING_LINK,
        login_link: import.meta.env.VITE_LOGIN_LINK,
        payment_link: import.meta.env.VITE_PAYMENT_LINK,
        chatbox_title: import.meta.env.VITE_CHATBOX_TITLE || "Bay Hotel Singapore",
        avatar: import.meta.env.VITE_AVATAR,
        x_auth_token: query.get("x_auth_token") || "",
    }} />;
}

export default App;
