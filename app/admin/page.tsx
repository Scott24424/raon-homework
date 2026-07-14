"use client";

import { useState, useEffect } from "react";
import { getDevices, updateDeviceStatus, deleteDevice, HomeworkRecord } from "@/app/actions";
import { Trash2, CheckCircle, XCircle } from "lucide-react";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [devices, setDevices] = useState<HomeworkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "0001") {
      setIsAuthenticated(true);
      fetchDevices();
    } else {
      setErrorMsg("비밀번호가 틀렸습니다.");
    }
  };

  const fetchDevices = async () => {
    setIsLoading(true);
    const data = await getDevices();
    setDevices(data);
    setIsLoading(false);
  };

  const handleUpdateStatus = async (deviceId: string, status: "approved" | "rejected" | "pending") => {
    const res = await updateDeviceStatus(deviceId, status);
    if (res.success) {
      await fetchDevices();
    } else {
      alert("상태 업데이트에 실패했습니다.");
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("정말 이 기기를 삭제하시겠습니까?")) return;
    const res = await deleteDevice(deviceId);
    if (res.success) {
      await fetchDevices();
    } else {
      alert("삭제에 실패했습니다.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-xl max-w-sm w-full border border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">관리자 로그인</h1>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">PIN 번호</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
              placeholder="비밀번호 입력"
              autoFocus
            />
          </div>

          {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

          <button 
            type="submit"
            className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-md hover:bg-slate-700 transition-colors"
          >
            접속
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">기기 관리 (Device Management)</h1>
          <button 
            onClick={() => fetchDevices()}
            className="bg-white text-slate-600 px-4 py-2 rounded-md shadow-sm border border-slate-200 hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">로딩 중...</div>
          ) : devices.length === 0 ? (
            <div className="p-12 text-center text-slate-500">등록된 기기가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm">
                    <th className="p-4 font-semibold border-b border-slate-200">상태</th>
                    <th className="p-4 font-semibold border-b border-slate-200">기기 정보 (User Agent)</th>
                    <th className="p-4 font-semibold border-b border-slate-200">기기 ID</th>
                    <th className="p-4 font-semibold border-b border-slate-200 text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.subject} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4">
                        {device.status === 'approved' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle size={14}/> 승인됨</span>}
                        {device.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">대기 중</span>}
                        {device.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle size={14}/> 거절됨</span>}
                      </td>
                      <td className="p-4 text-sm text-slate-700 max-w-[300px] truncate" title={device.day}>
                        {device.day}
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono">
                        {device.subject}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        {device.status !== 'approved' && (
                          <button 
                            onClick={() => handleUpdateStatus(device.subject, 'approved')}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600 transition-colors"
                          >
                            승인
                          </button>
                        )}
                        {device.status !== 'rejected' && (
                          <button 
                            onClick={() => handleUpdateStatus(device.subject, 'rejected')}
                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-200 hover:bg-red-100 transition-colors"
                          >
                            차단
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(device.subject)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
