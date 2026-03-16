import React, { useState, useMemo } from 'react';
import { 
  UserRoundCheck,
  UserRoundX,
  Clock, 
  ChevronDown, 
  Search, 
  ClockArrowUp,
  ClockArrowDown,
  ArrowDownAZ,
  ArrowUpAZ
} from 'lucide-react';
import { RegistOut } from '../../../types';

interface CheckOutDataProps {
  attendees: RegistOut[];
  onScanQR: () => void;
  onUpdateAttendance: (userId: string, isPresent: boolean) => void;
  users: {
    [key: string]: { 
      name: string;
    } 
  }
}

// Helper function to format the date and time
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Invalid date string:", dateString);
    return "Invalid Date";
  }
};

export const CheckOutData: React.FC<CheckOutDataProps> = ({ // <-- Changed component name and props
  attendees, 
  onUpdateAttendance,
  users
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortType, setSortType] = useState<'time' | 'alpha'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Memoize the filtering and sorting for performance
  const sortedAndFilteredAttendees = useMemo(() => {
    const filtered = attendees.filter(attendee => 
      users[attendee.user_id]?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    if (sortType === 'alpha') {
      filtered.sort((a, b) => 
        users[a.user_id]?.name.localeCompare(users[b.user_id]?.name)
      );
      if (sortOrder === 'desc') {
        filtered.reverse();
      }
    } else {
      // Sort by time
      filtered.sort((a, b) => {
        // Use isRegistedOut and waktu_regist_out
        const timeA = a.isRegistedOut ? new Date(a.waktu_regist_out || 0).getTime() : 0;
        const timeB = b.isRegistedOut ? new Date(b.waktu_regist_out || 0).getTime() : 0;
        
        if (timeA === 0 && timeB === 0) return 0;
        if (timeA === 0) return 1;
        if (timeB === 0) return -1;
        return timeA - timeB;
      });
      
      if (sortOrder === 'desc') {
        filtered.reverse();
      }
    }
    
    return filtered;
  }, [attendees, users, searchTerm, sortType, sortOrder]);

  const presentCount = attendees.filter(a => a.isRegistedOut).length; // <-- Changed to isRegistedOut
  const totalCount = attendees.length; 

  // Handle click on sort buttons
  const handleSortClick = (newSortType: 'time' | 'alpha') => {
    if (newSortType === sortType) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortType(newSortType);
      setSortOrder('asc');
    }
  };

  return (
    <div className="w-full">
      {/* Header - Now a button to toggle collapse */}
      <button
        className="flex items-center justify-between w-full mb-4 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-left">
          <h3 className="text-xl font-bold text-black mb-1">Check-Out Data</h3>
          <p className="text-sm text-gray-600">
            {presentCount} of {totalCount} participant exits
          </p>
        </div>
        <ChevronDown 
          size={24} 
          className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} 
        />
      </button>

      {/* Collapsible Content */}
      <div 
        className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}
      >
        {/* Search and Sort Controls */}
        <div className="flex flex-row gap-2 mb-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Sort Buttons */}
          <div className="flex-shrink-0 flex gap-2">
            <button
              onClick={() => handleSortClick('time')}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                sortType === 'time' 
                ? 'bg-gradient-to-tl from-[#ffda21] to-[#f6fb67] text-[#0b2241]' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {sortType === 'time' && sortOrder === 'asc' ? <ClockArrowUp size={16} /> : <ClockArrowDown size={16} />}
              <span className="hidden sm:inline">Sort by Time</span>
            </button>
            <button
              onClick={() => handleSortClick('alpha')}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                sortType === 'alpha' 
                ? 'bg-gradient-to-tl from-[#ffda21] to-[#f6fb67] text-[#0b2241]' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {sortType === 'alpha' && sortOrder === 'asc' ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
              <span className="hidden sm:inline">Sort A-Z</span>
            </button>
          </div>
        </div>

        {/* Attendee List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          {sortedAndFilteredAttendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md border border-gray-200"
            >
              <div className="flex items-center gap-3">
                {/* Green/Red Status Dot */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  attendee.isRegistedOut
                    ? 'bg-green-500 shadow-green-200 shadow-inner' 
                    : 'bg-red-500 shadow-red-200 shadow-inner'
                }`} />
                
                <div>
                  <span className={`font-semibold ${
                    attendee.isRegistedOut ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {users[attendee.user_id]?.name || attendee.user_id}
                  </span>
                  {/* Only show time if they are present */}
                  {attendee.isRegistedOut && attendee.waktu_regist_out && ( // <-- Changed properties
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                      <Clock size={14} />
                      {/* Formatted Time */}
                      <span>{formatDateTime(attendee.waktu_regist_out)}</span> {/* <-- Changed text and property */}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Green/Red "person" icon button */}
                <div
                  className={`p-2 rounded-full ${
                    attendee.isRegistedOut
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {attendee.isRegistedOut ? (
                    <UserRoundCheck size={18} />
                  ) : (
                    <UserRoundX size={18} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty States */}
        {sortedAndFilteredAttendees.length === 0 && searchTerm.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold">No participants found</p>
            <p className="text-sm">No names match your search term "{searchTerm}".</p>
          </div>
        )}

        {sortedAndFilteredAttendees.length === 0 && searchTerm.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <UserRoundX size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold">No participants have exited yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};