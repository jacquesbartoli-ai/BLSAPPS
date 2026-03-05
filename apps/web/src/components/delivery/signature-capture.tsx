import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

type SignaturePayload = {
  customerFirstName: string;
  signatureDataUrl: string;
  selfieDataUrl: string;
  latitude: number;
  longitude: number;
  signedAt: string;
};

type SignatureCaptureProps = {
  onValidate: (payload: SignaturePayload) => void;
};

export function SignatureCapture({ onValidate }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selfieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [firstName, setFirstName] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    signaturePadRef.current = new SignaturePad(canvasRef.current, {
      penColor: "#1D3A2F",
      minWidth: 1,
      maxWidth: 2.5
    });
    return () => {
      signaturePadRef.current?.off();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  async function startCamera() {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      await videoRef.current.play();
    }
  }

  async function captureGeolocation() {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    });
    const next = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    setCoords(next);
    return next;
  }

  function clearSignature() {
    signaturePadRef.current?.clear();
  }

  function captureSelfie() {
    if (!videoRef.current || !selfieCanvasRef.current) return "";
    const ctx = selfieCanvasRef.current.getContext("2d");
    if (!ctx) return "";
    selfieCanvasRef.current.width = videoRef.current.videoWidth || 640;
    selfieCanvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    return selfieCanvasRef.current.toDataURL("image/jpeg", 0.9);
  }

  async function handleValidate() {
    if (!firstName.trim()) {
      alert("Le prénom du client est obligatoire.");
      return;
    }
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert("La signature est obligatoire.");
      return;
    }
    const gps = coords ?? (await captureGeolocation());
    if (!gps) {
      alert("La géolocalisation n'a pas pu être récupérée.");
      return;
    }

    const selfieDataUrl = captureSelfie();
    if (!selfieDataUrl) {
      alert("La capture selfie a échoué.");
      return;
    }

    onValidate({
      customerFirstName: firstName.trim(),
      signatureDataUrl: signaturePadRef.current.toDataURL("image/png"),
      selfieDataUrl,
      latitude: gps.latitude,
      longitude: gps.longitude,
      signedAt: new Date().toISOString()
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-base font-semibold">Signature client</h3>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2"
        placeholder="Prénom du client"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <canvas ref={canvasRef} className="h-44 w-full rounded-md border border-border bg-white" />
      <div className="flex gap-2">
        <button className="rounded-md bg-accent px-3 py-2 text-sm" onClick={clearSignature}>
          Effacer
        </button>
        <button className="rounded-md bg-accent px-3 py-2 text-sm" onClick={startCamera}>
          Activer caméra
        </button>
        <button className="rounded-md bg-accent px-3 py-2 text-sm" onClick={captureGeolocation}>
          Capturer GPS
        </button>
      </div>
      <video ref={videoRef} className="h-40 w-full rounded-md border border-border bg-black object-cover" />
      <canvas ref={selfieCanvasRef} className="hidden" />
      <button className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground" onClick={handleValidate}>
        Valider signature + selfie + géoloc
      </button>
    </div>
  );
}
