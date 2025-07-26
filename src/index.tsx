import * as React from 'react';
import * as ReactDOM from 'react-dom';

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters
class Menu extends React.Component {
    constructor(props: any) {
        super(props);
        this.sendPhotos = this.sendPhotos.bind(this);
        this.openGallery = this.openGallery.bind(this);
    }

    sendPhotos(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log('Upload button clicked');
    }

    openGallery(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log('Open gallery button clicked');
    }

    render(): React.JSX.Element {
        return (
            <div className='place-self-center grid grid-cols-1 grid-rows-3 m-8 md:grid-rows-2'>
                <div className="title font row-1 place-self-center">
                    <h1>Alexandra & Iustin 2026</h1>
                    <h2>
                        &#xCE;nc&#x103;rca&#x21B;i poze &#x15F;i videoclipuri &#xEE;n Galeria Invita&#x21B;ilor!
                    </h2>
                </div>

                <div className='row-span-2 md:row-span-1 grid grid-cols-1 justify-items-center md:grid-cols-3 gap-4 mb-16 align-middle'>
                    <a href="#" onClick={this.openGallery} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/camera_icon.png" alt="" className="camera"/>
                        </div>
                        <p className="font row-1 self-center">Selecteaz&#x103;</p>
                    </a>

                    <a href="#" onClick={this.openGallery} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/gallery.svg" alt="" className="gallery"/>
                        </div>
                        <p className="font row-1 self-center">Galerie</p>
                    </a>

                    <a href="./success.html" onClick={this.openGallery} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/send_icon.png" alt="" className="send"/>
                        </div>
                        <p className="font row-1 self-center">Trimite</p>
                    </a>
                </div>
            </div>
        );
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    ReactDOM.render(
        <Menu />,
        document.getElementById('main')
    );
});