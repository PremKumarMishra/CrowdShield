import NetworkContext from "./context/NetworkContext";
import LanguageContext from "./context/LanguageContext";
import App from "./App";

export default function Main()
{
    return (
        <LanguageContext>
            <NetworkContext>
                <App/>
            </NetworkContext>
        </LanguageContext>
    )
}