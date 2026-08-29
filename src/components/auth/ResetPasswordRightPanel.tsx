import Image from "next/image";

export function ResetPasswordRightPanel() {
  return (
    <div className="w-full h-full bg-[#0D0B1F] flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full">
        <Image
          src="/slider/darkpanel.png"
          alt="SlickHood property management dashboard — properties, tenants, payments, maintenance and more"
          fill
          className="object-contain p-6"
          priority
        />
      </div>
    </div>
  );
}
