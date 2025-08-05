import * as React from "react";
import { setActiveMenu } from "./index";

export class MainMenu extends React.Component {
    constructor(props: any) {
        super(props);
        this.sendPhotos = this.sendPhotos.bind(this);
        this.openGallery = this.openGallery.bind(this);
    }

    sendPhotos(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log("Upload button clicked");
        setActiveMenu("success");
    }

    openGallery(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log("Open gallery button clicked");
    }

    selectFiles(event: FileList | null) {
        if (event && event.length > 0) {
            const fileCount = event.length;
            const selectionCountElement = document.getElementById("selection_count");
            if (selectionCountElement) {
                selectionCountElement.textContent = `${fileCount}`;
            }

            const sendButton = document.getElementById("send_button");
            if (sendButton) {
                sendButton.classList.remove("not-interactable");
                sendButton.classList.add("interactable");
            }
        } else {
            console.log("No files selected");
        }
    }

    render(): React.JSX.Element {
        return (
            <div className="place-self-center grid grid-cols-1 m-8 md:grid-rows-4 gap-2">
                <div className="title font md:row-span-3 place-self-center grid grid-cols-1 md:grid-cols-2 grid-rows-6 md:grid-rows-2 mb-4">
                    <h1 className="row-1 md:cols-1 md:self-end md:mb-2 self-center">
                        Alexandra & Iustin <br/> 5 Iulie 2026
                    </h1>
                    <img src="./img/photograph.jpg" alt="" className="row-span-4 md:row-span-2 md:row-start-1 md:cols-2 row-start-2 aspect-4/5 rounded-xl self-center justify-self-center max-w-[230px] object-contain w-full"/>
                    <h2 className="row-6 md:row-2 md:cols-1 md:self-start self-center">
                        &#xCE;nc&#x103;rca&#x21B;i poze &#x15F;i videoclipuri &#xEE;n <br/> Galeria Invita&#x21B;ilor!
                    </h2>
                </div>

                <div className="md:row-4 grid grid-cols-1 justify-items-center md:grid-cols-3 gap-4 align-middle">
                    <label htmlFor="file-upload" className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/camera.svg" alt="" className="image"/>
                        </div>
                        <p className="font main-text pl-3 row-1 self-center justify-self-start">Selecteaz&#x103;</p>
                    </label>
                    <input type="file" id="file-upload" onChange={(event) => this.selectFiles(event.target.files)} multiple hidden accept="image/*, video/*"/>

                    <a href="#" onClick={this.openGallery} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/gallery.svg" alt="" className="image"/>
                        </div>
                        <p className="font main-text pl-3 row-1 self-center justify-self-start">Vezi Galeria</p>
                    </a>

                    <a id="send_button" href="#" onClick={this.sendPhotos} className="button not-interactable w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/send.svg" alt="" className="image"/>
                        </div>
                        <div className="pl-3 row-1 self-center grid grid-cols-1 grid-rows-2 justify-self-start">
                            <p className="font main-text row-1 self-center justify-self-center">Trimite</p>
                            <div className="font subtext row-2 self-center grid grid-cols-3">
                                <p id="selection_count" className="col-1 justify-self-auto">0</p>
                                <p className="col-start-2 col-span-2 justify-self-auto ml-2">fi&#x15F;iere</p>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        );
    }
}