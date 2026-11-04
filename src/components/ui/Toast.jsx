export default function Toast({ toast }) {
    if (!toast) return null;

    const baseClasses = "fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 text-sm font-bold";

    let typeClasses = 'bg-white border-slate-200 text-slate-800';
    if (toast.type === 'error') {
        typeClasses = 'bg-red-50 border-red-200 text-red-800';
    } else if (toast.type === 'success') {
        typeClasses = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    }

    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <p>{toast.message}</p>
        </div>
    );
}
