import * as React from "react";
import * as ReactDOM from "react-dom";
import { SuccessNotification } from "./success";
import { MainMenu } from "./mainMenu";
import { LoadingScreen } from "./loading";

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters
class Index extends React.Component {
    state = { activeMenu: "main" };

    static instance: Index | null = null;

    constructor(props: any) {
        super(props);
        Index.instance = this;
    }

    static setActiveMenu(menu: string) {
        const element: Element = document.querySelector('#main')!;
        element.classList.add('fade-out');

        element.addEventListener('animationend', () => {
            element.classList.remove('fade-out');
            element.classList.add('fade-in');
            Index.instance?.setState({ activeMenu: menu });

            element.addEventListener('animationend', () => {
                element.classList.remove('fade-in');
            }, { once: true });

        }, { once: true });
    }

    render(): React.ReactNode {
        return (
            <div className="grid grid-cols-1 place-items-center">
                {this.state.activeMenu === "main" && <MainMenu />}
                {this.state.activeMenu === "loading" && <LoadingScreen />}
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