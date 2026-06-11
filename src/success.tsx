import * as React from "react";
import { setActiveMenu } from "./index";
import { IMMICH_SHARE_URL } from "./immich";

export class SuccessNotification extends React.Component {
    constructor(props: any) {
        super(props);
        this.goBack = this.goBack.bind(this);
        this.openGallery = this.openGallery.bind(this);
    }

    goBack(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        setActiveMenu("main");
    }

    openGallery(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        if (!IMMICH_SHARE_URL) {
            alert("Galeria nu este configurat\u0103.");
            return;
        }
        window.location.assign(IMMICH_SHARE_URL);
    }

    render(): React.JSX.Element {
        return (
            <div className="place-self-center grid grid-cols-1 m-8 gap-2">
                <h1 className="title font place-self-center mb-4">Mul&#x163;umim pentru contribu&#x163;ie!</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 justify-items-center gap-4">
                    <a href="#" onClick={this.openGallery} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-3 self-center">
                            <img src="./img/gallery.svg" alt="" className="image"/>
                        </div>
                        <p className="font main-text row-1 self-center justify-self-start">Vezi Galeria</p>
                    </a>

                    <a href="#" onClick={this.goBack} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-3 self-center">
                            <img src="./img/back.svg" alt="" className="image"/>
                        </div>
                        <p className="font main-text row-1 self-center justify-self-start">&#xCE;ncarc&#x103; altceva</p>
                    </a>
                </div>
            </div>
        );
    }
}