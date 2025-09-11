import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserProfile } from "../../../types";
import MyQRCodeModal from "../feature/MyQRCodeModal";

interface PesertaFeaturesProps {
  userProfile: UserProfile;
}

type FeatureItem =
  | {
      key: "attendance" | "scoreboard" | "clock";
      title: string;
      subtitle?: string;
      svg: string;
      path: string;
      isModal?: false;
    }
  | {
      key: "qr";
      title: string;
      subtitle?: string;
      svg: string;
      isModal: true;
    };

const PesertaFeatures: React.FC<PesertaFeaturesProps> = ({ userProfile }) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isQrModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isQrModalOpen]);

  // Refined titles + optional subtitles (consistent, modern tone)
  const featureData: Record<string, FeatureItem> = {
    attendance: {
      key: "attendance",
      title: "Check‑In",
      subtitle: "Mark your presence",
      svg: "/svg/blocks/book.svg",
      path: "/peserta/daftar-kehadiran",
    },
    qr: {
      key: "qr",
      title: "My QR",
      subtitle: "Show to staff",
      svg: "/svg/blocks/sight.svg",
      isModal: true,
    },
    scoreboard: {
      key: "scoreboard",
      title: "Leaderboard",
      subtitle: "Live standings",
      svg: "/svg/blocks/trophy.svg",
      path: "/peserta/scoreboard",
    },
    clock: {
      key: "clock",
      title: "Match Timer",
      subtitle: "Tap Play to start 3‑2‑1",
      svg: "/svg/blocks/sandglass.svg",
      path: "/peserta/chess-clock",
    },
  };

  return (
    <>
      <style>
        {`
          .floating-title {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            padding: 8px 14px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
            z-index: 100;
            white-space: nowrap;
            transition: transform 0.25s ease-out, opacity 0.2s ease-out;
            top: -34px;
          }
          .floating-title .ft-title {
            font-weight: 800;
            letter-spacing: 0.2px;
            color: #2f56e5;
            font-size: 14px;
            line-height: 1.05;
          }
          .floating-title .ft-sub {
            font-weight: 600;
            color: rgba(20, 30, 55, 0.75);
            font-size: 10px;
            line-height: 1.05;
          }

          /* tablet */
          @media (min-width: 768px) {
            .floating-title {
              top: -54px;
              padding: 10px 16px;
              border-radius: 14px;
            }
            .floating-title .ft-title { font-size: 24px; }
            .floating-title .ft-sub { font-size: 14px; }
          }

          /* desktop */
          @media (min-width: 1024px) {
            .floating-title {
              top: -64px;
              padding: 12px 18px;
              border-radius: 16px;
            }
            .floating-title .ft-title { font-size: 36px; }
            .floating-title .ft-sub { font-size: 16px; }
          }

          .group:hover .floating-title {
            transform: translateX(-50%) translateY(-6px);
          }

          /* Media query khusus untuk desktop 1366x768 */
          @media (min-width: 1366px) and (max-height: 800px) {
            /* Block positions untuk desktop 1366x768 - menggunakan nilai lg */
            .block-desktop-1366 {
              bottom: 20% !important;
            }
            .block-desktop-1366-2 {
              bottom: 10% !important;
            }
            .block-desktop-1366-3 {
              bottom: 0% !important;
            }
            .block-desktop-1366-4 {
              bottom: -20% !important;
            }
            .block-desktop-1366-5 {
              bottom: -30% !important;
            }
            .block-desktop-1366-6 {
              bottom: -35% !important;
            }
            .block-desktop-1366-7 {
              bottom: -45% !important;
            }
            
            /* Feature positions untuk desktop 1366x768 - menggunakan nilai lg */
            .feature-desktop-1366-1 {
              bottom: 40% !important;
            }
            .feature-desktop-1366-2 {
              bottom: 20% !important;
            }
            .feature-desktop-1366-3 {
              bottom: 0% !important;
            }
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
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-20 bottom-[40%] lg:bottom-[20%] xl:bottom-[5%] 2xl:bottom-[-5%] block-desktop-1366 left-[26%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-20 bottom-[40%] lg:bottom-[20%] xl:bottom-[5%] 2xl:bottom-[-5%] block-desktop-1366 left-[50%]"
              />
              <img
                src="/svg/blocks/block w m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-20 bottom-[30%] lg:bottom-[10%] xl:bottom-[-5%] 2xl:bottom-[-15%] block-desktop-1366-2 left-[38%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-40 bottom-[20%] lg:bottom-[0%] xl:bottom-[-15%] 2xl:bottom-[-25%] block-desktop-1366-3 left-[26%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-40 bottom-[20%] lg:bottom-[0%] xl:bottom-[-15%] 2xl:bottom-[-25%] block-desktop-1366-3 left-[50%]"
              />
              <img
                src="/svg/blocks/block w m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[0%] lg:bottom-[-20%] xl:bottom-[-35%] 2xl:bottom-[-45%] block-desktop-1366-4 left-[14%]"
              />
              <img
                src="/svg/blocks/block w m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[0%] lg:bottom-[-20%] xl:bottom-[-35%] 2xl:bottom-[-45%] block-desktop-1366-4 left-[62%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-10%] lg:bottom-[-30%] xl:bottom-[-45%] 2xl:bottom-[-55%] block-desktop-1366-5 left-[26%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-10%] lg:bottom-[-30%] xl:bottom-[-45%] 2xl:bottom-[-55%] block-desktop-1366-5 left-[50%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-40 bottom-[15%] lg:bottom-[-5%] xl:bottom-[-20%] 2xl:bottom-[-30%] block-desktop-1366-2 left-[2%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-40 bottom-[15%] lg:bottom-[-5%] xl:bottom-[-20%] 2xl:bottom-[-30%] block-desktop-1366-2 left-[74%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-15%] lg:bottom-[-35%] xl:bottom-[-50%] 2xl:bottom-[-60%] block-desktop-1366-6 left-[2%]"
              />
              <img
                src="/svg/blocks/block b m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-15%] lg:bottom-[-35%] xl:bottom-[-50%] 2xl:bottom-[-60%] block-desktop-1366-6 left-[74%]"
              />
              <img
                src="/svg/blocks/block w m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-25%] lg:bottom-[-45%] xl:bottom-[-60%] 2xl:bottom-[-70%] block-desktop-1366-7 left-[38%]"
              />
              <img
                src="/svg/blocks/block w m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-25%] lg:bottom-[-45%] xl:bottom-[-60%] 2xl:bottom-[-70%] block-desktop-1366-7 left-[14%]"
              />
              <img
                src="/svg/blocks/block w m.svg"
                alt="Decoration"
                className="absolute w-[24%] z-50 bottom-[-25%] lg:bottom-[-45%] xl:bottom-[-60%] 2xl:bottom-[-70%] block-desktop-1366-7 left-[62%]"
              />

              {/* Scoreboard */}
              <Link
                to={(featureData.scoreboard as any).path}
                className="group absolute w-[25%] z-10 cursor-pointer bottom-[50%] lg:bottom-[40%] xl:bottom-[30%] feature-desktop-1366-1 left-[37.5%]"
                aria-label={featureData.scoreboard.title}
              >
                <div className="relative">
                  <div className="floating-title">
                    <span className="ft-title">
                      {featureData.scoreboard.title}
                    </span>
                    {featureData.scoreboard.subtitle && (
                      <span className="ft-sub">
                        {featureData.scoreboard.subtitle}
                      </span>
                    )}
                  </div>
                  <img
                    src={featureData.scoreboard.svg}
                    alt={featureData.scoreboard.title}
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg"
                  />
                </div>
              </Link>

              {/* Chess Clock */}
              <Link
                to={(featureData.clock as any).path}
                className="group absolute w-[24%] z-30 cursor-pointer bottom-[30%] lg:bottom-[20%] xl:bottom-[10%] feature-desktop-1366-2 left-[14%]"
                aria-label={featureData.clock.title}
              >
                <div className="relative">
                  <div className="floating-title">
                    <span className="ft-title">{featureData.clock.title}</span>
                    {featureData.clock.subtitle && (
                      <span className="ft-sub">
                        {featureData.clock.subtitle}
                      </span>
                    )}
                  </div>
                  <img
                    src={featureData.clock.svg}
                    alt={featureData.clock.title}
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg"
                  />
                </div>
              </Link>

              {/* Attendance */}
              <Link
                to={(featureData.attendance as any).path}
                className="group absolute w-[24%] z-30 cursor-pointer bottom-[30%] lg:bottom-[20%] xl:bottom-[10%] feature-desktop-1366-2 left-[62%]"
                aria-label={featureData.attendance.title}
              >
                <div className="relative">
                  <div className="floating-title">
                    <span className="ft-title">
                      {featureData.attendance.title}
                    </span>
                    {featureData.attendance.subtitle && (
                      <span className="ft-sub">
                        {featureData.attendance.subtitle}
                      </span>
                    )}
                  </div>
                  <img
                    src={featureData.attendance.svg}
                    alt={featureData.attendance.title}
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg"
                  />
                </div>
              </Link>

              {/* QR Scanner */}
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="group absolute w-[24%] z-40 cursor-pointer bottom-[10%] lg:bottom-[0%] xl:bottom-[-10%] feature-desktop-1366-3 left-[38%]"
                aria-label={featureData.qr.title}
              >
                <div className="relative">
                  <div className="floating-title">
                    <span className="ft-title">{featureData.qr.title}</span>
                    {featureData.qr.subtitle && (
                      <span className="ft-sub">
                        {featureData.qr.subtitle}
                      </span>
                    )}
                  </div>
                  <img
                    src={featureData.qr.svg}
                    alt={featureData.qr.title}
                    className="w-full h-auto transition-transform duration-300 ease-out group-hover:-translate-y-4 filter drop-shadow-lg"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <MyQRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </>
  );
};

export default PesertaFeatures;