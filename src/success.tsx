import * as React from "react";
import { setActiveMenu } from "./index";

export class SuccessNotification extends React.Component {
    constructor(props: any) {
        super(props);
    }

    goBack(event: React.MouseEvent<HTMLAnchorElement>) {
        setActiveMenu("main");
    };

    render(): React.JSX.Element {
        return (
            <div className="place-self-center grid grid-cols-1 grid-rows-2 m-8 gap-2">
                <h1 className="title font row-1 place-self-center">Mul&#x163;umim pentru contribu&#x163;ie!</h1>

                <a href="#" onClick={this.goBack} className="button row-2 w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                    <div className="icon justify-self-end row-1 mr-3 self-center">
                        <img src="./img/back.svg" alt="" className="image"/>
                    </div>
                    <p className="font main-text row-1 self-center justify-self-start">&#xCE;ncarc&#x103; altceva</p>
                </a>
            </div>
        );
    }
}