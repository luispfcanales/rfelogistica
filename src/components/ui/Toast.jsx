export default function Toast({ toast }) {
    if (!toast) return null;

    const baseClasses = "fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 text-sm font-medium";

    let typeClasses = 'bg-[#161B22] border-[#2D333B] text-gray-300';
    if (toast.type === 'error') {
        typeClasses = 'bg-red-900/50 border-red-800 text-red-200';
    } else if (toast.type === 'success') {
        typeClasses = 'bg-emerald-900/50 border-emerald-800 text-emerald-200';
    }

    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <p>{toast.message}</p>
        </div>
    );
}
