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
  TooltipProps,
  LabelList
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
  height = 180
}) => {
  // Ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-[180px]">No data available</div>;
  }

  // Filter data to only include items with count > 0
  const filteredData = data.filter(item => item[dataKey] > 0);

  // Function to render custom label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    // Only show labels for segments that are at least 5% of the total
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#333"
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="10px"
      >
        {name}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={70}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
          label={renderCustomizedLabel}
        >
          {filteredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={tooltipFormatter}
        />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center"
          wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
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
  height = 180
}) => {
  // Ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-[180px]">No data available</div>;
  }

  // If we have many data points, we need to adjust the margin
  const dynamicMargin = data.length > 5 
    ? { top: 20, right: 10, left: 10, bottom: 60 } 
    : { top: 20, right: 10, left: 10, bottom: 30 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={dynamicMargin}
        barSize={data.length > 6 ? 20 : 30}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={xKey} 
          fontSize={10}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={60}
          tickMargin={5}
        />
        <YAxis fontSize={10} />
        <Tooltip formatter={tooltipFormatter} />
        <Bar dataKey={yKey} fill="#8884d8">
          <LabelList dataKey={yKey} position="top" fontSize={10} />
        </Bar>
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
    <div className="flex justify-center items-center h-[180px]">Line chart component added for future use</div>
  );
};