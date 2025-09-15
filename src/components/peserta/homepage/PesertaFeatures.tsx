import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../../../types';
import QrScannerModal from '../feature/QRScannerModal';

interface PesertaFeaturesProps {
  userProfile: UserProfile;
}

const PesertaFeatures: React.FC<PesertaFeaturesProps> = ({ userProfile }) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (isQrModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isQrModalOpen]);

  const featureData = {
    attendance: { name: 'Attendance', svg: '/svg/blocks/book.svg', path: '/peserta/daftar-kehadiran' },
    qr: { name: 'QR Code', svg: '/svg/blocks/sight.svg', isModal: true },
    scoreboard: { name: 'Scoreboard', svg: '/svg/blocks/trophy.svg', path: '/peserta/scoreboard' },
    clock: { name: 'Chess Clock', svg: '/svg/blocks/sandglass.svg', path: '/peserta/chess-clock' }
  };

  return (
    <>
      <section 
        id="features" 
        className="relative min-h-screen w-full flex flex-col justify-end overflow-hidden bg-gradient-to-t from-[#47618a] to-[#E3E1DA]"
      >
        <div className="relative w-full h-[65vh] md:h-[50vh]">
          <div className="absolute inset-0 block">
            
            <div className="absolute inset-0 transform-gpu origin-bottom scale-[1.4] md:scale-[0.85]">

              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-20 bottom-[40%] sm:bottom-[-38%] md:bottom-[40%]  xl:bottom-[-50%] left-[26%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-20 bottom-[40%] sm:bottom-[-38%] md:bottom-[40%]  xl:bottom-[-50%] left-[50%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-20 bottom-[30%] sm:bottom-[-50%] md:bottom-[30%] xl:bottom-[-70%] left-[38%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-40 bottom-[20%] sm:bottom-[-63%] md:bottom-[20%] xl:bottom-[-90%] left-[26%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-40 bottom-[20%] sm:bottom-[-63%] md:bottom-[20%] xl:bottom-[-90%] left-[50%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[0%] xl:bottom-[-110%] left-[14%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[0%] xl:bottom-[-110%] left-[62%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-10%] xl:bottom-[-130%] left-[26%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-10%] xl:bottom-[-130%] left-[50%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-40 bottom-[15%] xl:bottom-[-90%] left-[2%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-40 bottom-[15%] xl:bottom-[-90%] left-[74%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-15%] xl:bottom-[-130%] left-[2%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-15%] xl:bottom-[-130%] left-[74%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-25%] xl:bottom-[-150%] left-[38%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-25%] xl:bottom-[-150%] left-[14%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="sm:hidden md:block absolute w-[24%] z-50 bottom-[-25%] xl:bottom-[-150%] left-[62%]" />
              
              <Link
                to={featureData.scoreboard.path}
                className="group absolute w-[25%] z-10 cursor-pointer bottom-[50%] sm:bottom-[-25%] md:bottom-[50%] xl:bottom-[-30%] left-[37.5%]"
              >
                <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-4">
                  <div className="absolute -top-8 sm:-top-12 md:-top-8 xl:-top-12 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-white/70 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-lg">
                      <span className="text-xs md:text-sm font-medium text-[#47618a] whitespace-nowrap">
                        {featureData.scoreboard.name}
                      </span>
                    </div>
                  </div>
                  <img
                    src={featureData.scoreboard.svg}
                    alt={featureData.scoreboard.name}
                    className="w-full h-auto filter drop-shadow-lg"
                  />
                </div>
              </Link>


              <Link
                to={featureData.clock.path}
                className="group absolute w-[24%] z-30 cursor-pointer bottom-[30%] sm:bottom-[-50%] md:bottom-[30%] xl:bottom-[-70.25%] left-[14%]"
              >
                <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-4">
                  <div className="absolute -top-8 sm:-top-12 md:-top-8 xl:-top-12 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-white/70 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-lg">
                      <span className="text-xs md:text-sm font-medium text-[#47618a] whitespace-nowrap">
                        {featureData.clock.name}
                      </span>
                    </div>
                  </div>
                  <img
                    src={featureData.clock.svg}
                    alt={featureData.clock.name}
                    className="w-full h-auto filter drop-shadow-lg"
                  />
                </div>
              </Link>

              <Link
                to={featureData.attendance.path}
                className="group absolute w-[24%] z-30 cursor-pointer bottom-[30%] sm:bottom-[-50%] md:bottom-[30%] xl:bottom-[-70.5%] left-[62%]"
              >
                <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-4">
                  <div className="absolute -top-8 sm:-top-12 md:-top-8 xl:-top-12 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-white/70 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-lg">
                      <span className="text-xs md:text-sm font-medium text-[#47618a] whitespace-nowrap">
                        {featureData.attendance.name}
                      </span>
                    </div>
                  </div>
                  <img
                    src={featureData.attendance.svg}
                    alt={featureData.attendance.name}
                    className="w-full h-auto filter drop-shadow-lg"
                  />
                </div>
              </Link>

              <button
                onClick={() => setIsQrModalOpen(true)}
                className="group absolute w-[24%] z-40 cursor-pointer bottom-[10%] sm:bottom-[-76%] md:bottom-[10%] xl:bottom-[-110.5%] left-[38%]"
              >
                <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-4">
                  <div className="absolute -top-8 sm:-top-12 md:-top-8 xl:-top-12 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-white/70 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-lg">
                      <span className="text-xs md:text-sm font-medium text-[#47618a] whitespace-nowrap">
                        {featureData.qr.name}
                      </span>
                    </div>
                  </div>
                  <img
                    src={featureData.qr.svg}
                    alt={featureData.qr.name}
                    className="w-full h-auto filter drop-shadow-lg"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <QrScannerModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />
    </>
  );
};

export default PesertaFeatures;