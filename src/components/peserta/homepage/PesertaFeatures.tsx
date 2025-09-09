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
    qr: { name: 'Scan QR Code', svg: '/svg/blocks/sight.svg', isModal: true },
    scoreboard: { name: 'Scoreboard', svg: '/svg/blocks/trophy.svg', path: '/peserta/scoreboard' },
    clock: { name: 'Chess Clock', svg: '/svg/blocks/sandglass.svg', path: '/peserta/chess-clock' }
  };

  return (
    <>
      <style>
        {`
          .floating-text {
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.60);
            padding: 6px 12px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-weight: 600;
            color: #4776E6;
            z-index: 100;
            white-space: nowrap;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            text-transform: uppercase;
            transition: all 0.3s ease-out;
            
            /* Ukuran font default untuk mobile */
            font-size: 12px;
            padding: 4px 8px;
            top: -30px;
          }
          
          /* Untuk tablet dan desktop */
          @media (min-width: 768px) {
            .floating-text {
              font-size: 30px;
              padding: 6px 12px;
              top: -50px;
            }
          }
          
          /* Untuk desktop besar */
          @media (min-width: 1024px) {
            .floating-text {
              font-size: 50px;
              padding: 8px 16px;
              top:-60px;
            }
          }
          
          .group:hover .floating-text {
            transform: translateX(-50%) translateY(-8px);
          }
        `}
      </style>
      
      <section 
        id="features" 
        className="relative min-h-screen w-full flex flex-col justify-end overflow-hidden bg-gradient-to-t from-[#47618a] to-[#E3E3DA]"
      >
        <div className="relative w-full h-[65vh] md:h-[50vh]">
          <div className="absolute inset-0 block">
            
            <div className="absolute inset-0 transform-gpu origin-bottom scale-[1.4] md:scale-[0.85]">

              {/* Background blocks */}
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-20 bottom-[40%] lg:bottom-[-30%] left-[26%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-20 bottom-[40%] lg:bottom-[-30%] left-[50%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-20 bottom-[30%] lg:bottom-[-50%] left-[38%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-40 bottom-[20%] lg:bottom-[-70%] left-[26%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-40 bottom-[20%] lg:bottom-[-70%] left-[50%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[0%] lg:bottom-[-90%] left-[14%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[0%] lg:bottom-[-90%] left-[62%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-10%] lg:bottom-[-110%] left-[26%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-10%] lg:bottom-[-110%] left-[50%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-40 bottom-[15%] lg:bottom-[-70%] left-[2%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-40 bottom-[15%] lg:bottom-[-70%] left-[74%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-15%] lg:bottom-[-110%] left-[2%]" />
              <img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-15%] lg:bottom-[-110%] left-[74%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-25%] lg:bottom-[-130%] left-[38%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-25%] lg:bottom-[-130%] left-[14%]" />
              <img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute w-[24%] z-50 bottom-[-25%] lg:bottom-[-130%] left-[62%]" />
              
              {/* Scoreboard with floating text */}
              <Link to={featureData.scoreboard.path} className="group absolute w-[25%] z-10 cursor-pointer bottom-[50%] lg:bottom-[-10%] left-[37.5%]">
                <div className="relative">
                  <div className="floating-text">{featureData.scoreboard.name}</div>
                  <img 
                    src={featureData.scoreboard.svg} 
                    alt={featureData.scoreboard.name} 
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg" 
                  />
                </div>
              </Link>

              {/* Chess Clock with floating text */}
              <Link to={featureData.clock.path} className="group absolute w-[24%] z-30 cursor-pointer bottom-[30%] lg:bottom-[-50.25%] left-[14%]">
                <div className="relative">
                  <div className="floating-text">{featureData.clock.name}</div>
                  <img 
                    src={featureData.clock.svg} 
                    alt={featureData.clock.name} 
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg" 
                  />
                </div>
              </Link>

              {/* Attendance with floating text */}
              <Link to={featureData.attendance.path} className="group absolute w-[24%] z-30 cursor-pointer bottom-[30%] lg:bottom-[-50.5%] left-[62%]">
                <div className="relative">
                  <div className="floating-text">{featureData.attendance.name}</div>
                  <img 
                    src={featureData.attendance.svg} 
                    alt={featureData.attendance.name} 
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg" 
                  />
                </div>
              </Link>
              
              {/* QR Scanner with floating text */}
              <button onClick={() => setIsQrModalOpen(true)} className="group absolute w-[24%] z-40 cursor-pointer bottom-[10%] lg:bottom-[-90.5%] left-[38%]">
                <div className="relative">
                  <div className="floating-text">{featureData.qr.name}</div>
                  <img 
                    src={featureData.qr.svg} 
                    alt={featureData.qr.name} 
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg" 
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