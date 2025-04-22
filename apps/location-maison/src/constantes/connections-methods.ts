import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const connectionMethods = [
    {
        icon: FcGoogle,
        method: "GOOGLE",
        colorIcon: undefined
    },
    /* {
        icon: FaFacebookF,
        method: "FACEBOOK",
        colorIcon: "blue"
    }, */
] as const;

export default connectionMethods