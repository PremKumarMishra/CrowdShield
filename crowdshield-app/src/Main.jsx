import NetworkContext from "./context/NetworkContext";
import LanguageContext from "./context/LanguageContext";
import App from "./App";

export default function Main()
{
    //console.log("JUST A TEST")
    return (
        <LanguageContext>
            <NetworkContext>
                <App/>
            </NetworkContext>
        </LanguageContext>
    )
}