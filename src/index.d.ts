export {};

import { JwtPayload } from "jwt-decode";

declare global {
    interface Window {
        onconnect: CallableFunction;
    }

    interface ChatbotProp {
        app_key?: string;
        x_auth_token?: string;
        customer_id?: string;
        property_code?: string;
        booking_link?: string;
        login_link?: string;
        payment_link?: string;
        chatbox_title?: string;
        avatar?: string;
    }

    interface IJwtPayload extends JwtPayload {
        data: {
            [key: string]: string;
        };
    }
}