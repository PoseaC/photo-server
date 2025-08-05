import * as React from "react";
import * as ReactDOM from "react-dom";
import { SuccessNotification } from "./success";
import { MainMenu } from "./mainMenu";

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters
class Index extends React.Component {
    state = { activeMenu: "main" };

    static instance: Index | null = null;

    constructor(props: any) {
        super(props);
        Index.instance = this;
    }

    static setActiveMenu(menu: string) {
        if (Index.instance) {
            Index.instance.setState({ activeMenu: menu });
        }
    }

    render(): React.ReactNode {
        return (
            <div className="grid grid-cols-1 place-items-center">
                {this.state.activeMenu === "main" && <MainMenu />}
                {/* {this.state.activeMenu === "loading" && <LoadingScreen />} */}
                {this.state.activeMenu === "success" && <SuccessNotification />}
            </div>
        );
    }
}
export const setActiveMenu = Index.setActiveMenu;

window.addEventListener("DOMContentLoaded", async () => {
    ReactDOM.render(
        <Index />,
        document.getElementById("main")
    );
});