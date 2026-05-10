import PropTypes from 'prop-types';
import { useState } from 'react';

export default function ReportForm({ onSubmit }) {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    date: getTodayString(),
    location: '',
    startTime: '',
    endTime: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Also clear the general time error if either time field changes
    if ((name === 'startTime' || name === 'endTime') && errors.time) {
      setErrors(prev => ({ ...prev, time: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'תאריך הוא שדה חובה';
    if (!formData.location) newErrors.location = 'מיקום הוא שדה חובה';
    if (!formData.startTime) newErrors.startTime = 'שעת התחלה היא שדה חובה';
    if (!formData.endTime) newErrors.endTime = 'שעת סיום היא שדה חובה';

    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.time = 'שעת סיום חייבת להיות אחרי שעת התחלה';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div dir="rtl" className="w-full p-4 md:max-w-lg md:mx-auto bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">דיווח שעות</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Date Field */}
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">תאריך</label>
          <input
            type="date"
            id="date"
            name="date"
            max={getTodayString()}
            value={formData.date}
            onChange={handleChange}
            className={`w-full rounded-lg border p-3 min-h-[44px] text-base transition-colors ${
              errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
            }`}
          />
          {errors.date && <span className="text-red-500 text-sm mt-1">{errors.date}</span>}
        </div>

        {/* Location Field */}
        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">מיקום</label>
          <select
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={`w-full rounded-lg border p-3 min-h-[44px] text-base bg-white transition-colors ${
              errors.location ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
            }`}
          >
            <option value="" disabled>בחר מיקום</option>
            <option value="משרד">משרד</option>
            <option value="לקוח">לקוח</option>
            <option value="בית">בית</option>
          </select>
          {errors.location && <span className="text-red-500 text-sm mt-1">{errors.location}</span>}
        </div>

        {/* Times Row (stacked on mobile, side-by-side on md) */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex-1 flex flex-col gap-1">
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">שעת התחלה</label>
            <input
              type="time"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className={`w-full rounded-lg border p-3 min-h-[44px] text-base transition-colors ${
                errors.startTime || errors.time ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              }`}
            />
            {errors.startTime && <span className="text-red-500 text-sm mt-1">{errors.startTime}</span>}
          </div>
          
          <div className="flex-1 flex flex-col gap-1">
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">שעת סיום</label>
            <input
              type="time"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={`w-full rounded-lg border p-3 min-h-[44px] text-base transition-colors ${
                errors.endTime || errors.time ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              }`}
            />
            {errors.endTime && <span className="text-red-500 text-sm mt-1">{errors.endTime}</span>}
          </div>
        </div>
        
        {/* General time logic error */}
        {errors.time && <div className="text-red-500 text-sm -mt-2">{errors.time}</div>}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg py-3 px-6 min-h-[44px] font-medium transition-colors"
          >
            שמור דיווח
          </button>
        </div>
      </form>
    </div>
  );
}

ReportForm.propTypes = {
  onSubmit: PropTypes.func
};

ReportForm.defaultProps = {
  onSubmit: () => {}
};
