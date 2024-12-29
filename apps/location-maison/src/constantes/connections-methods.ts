import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const connectionMethods = [
    {
        icon: FcGoogle,
        method: "GOOGLE",
    },
    {
        icon: FaFacebookF,
        method: "FACEBOOK",
    },
] as const;

export default connectionMethods