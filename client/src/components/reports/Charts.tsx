import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  TooltipProps
} from 'recharts';

// Define consistent colors for charts
const COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
];

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  tooltipFormatter?: (value: any, name: any) => [string, string];
  height?: number;
}

export const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  tooltipFormatter,
  height = 120
}) => {
  // Ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-[120px]">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={50}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={tooltipFormatter}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  tooltipFormatter?: (value: any) => [string];
  height?: number;
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  tooltipFormatter,
  height = 120
}) => {
  // Ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-[120px]">No data available</div>;
  }

  // If we have many data points, we need to adjust the margin
  const dynamicMargin = data.length > 5 
    ? { top: 5, right: 5, left: 5, bottom: 80 } 
    : { top: 5, right: 5, left: 5, bottom: 30 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={dynamicMargin}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={xKey} 
          fontSize={10}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={60}
        />
        <YAxis hide={true} />
        <Tooltip formatter={tooltipFormatter} />
        <Bar dataKey={yKey} fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

interface LineChartProps {
  data: any[];
  xKey: string;
  lines: {
    dataKey: string;
    color: string;
    name: string;
  }[];
  height?: number;
}

export const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  xKey,
  lines,
  height = 240
}) => {
  // This component is currently not used but added for future extensions
  return (
    <div className="flex justify-center items-center h-[120px]">Line chart component added for future use</div>
  );
};