interface SuccessModalProps {
    open: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export default function SuccessModal({
    open,
    title,
    message,
    onClose,
}: SuccessModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-3xl text-green-600">✓</span>
                </div>

                <h2 className="text-2xl font-bold text-[#08184A]">
                    {title}
                </h2>

                <p className="text-gray-500 mt-2">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="mt-6 w-full py-3 rounded-xl bg-[#FF4B12] text-white font-semibold"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}