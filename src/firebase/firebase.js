import admin from "firebase-admin";
import { serviceAccount } from "./skatekarnataka-firebase-adminsdk-fbsvc-69142c789b";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;
