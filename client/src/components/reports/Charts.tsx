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
  height = 300 // Increased default height
}) => {
  // Ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-[300px]">No data available</div>;
  }

  // Filter data to only include items with count > 0
  const filteredData = data.filter(item => item[dataKey] > 0);

  // Function to render custom label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    // Only show labels for segments that are at least 3% of the total
    if (percent < 0.03) return null;

    const RADIAN = Math.PI / 180;
    // Increase radius for label placement further away from the pie
    const radius = outerRadius * 1.25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Calculate a position for the percentage on the same line
    const percentX = cx + (radius + 8) * Math.cos(-midAngle * RADIAN);
    const percentY = cy + (radius + 8) * Math.sin(-midAngle * RADIAN);

    return (
      <>
        {/* Draw a clear line from pie edge to label */}
        <line
          x1={cx + (outerRadius + 1) * Math.cos(-midAngle * RADIAN)}
          y1={cy + (outerRadius + 1) * Math.sin(-midAngle * RADIAN)}
          x2={x}
          y2={y}
          stroke="#999"
          strokeWidth={1}
        />
        {/* Main category name label */}
        <text 
          x={x} 
          y={y} 
          fill="#555"
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          fontSize="12px"
          fontWeight="500"
        >
          {name} ({(percent * 100).toFixed(0)}%)
        </text>
      </>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 10, right: 30, bottom: 30, left: 30 }}>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          labelLine={false} // Set to false since we're drawing our own lines
          innerRadius={0} // Solid pie (can be adjusted for donut chart)
          outerRadius={height > 300 ? 120 : 90} // Larger pie size
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
          paddingAngle={2} // Add small space between segments for better visibility
          label={renderCustomizedLabel}
        >
          {filteredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={1} />
          ))}
        </Pie>
        <Tooltip 
          formatter={tooltipFormatter}
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid #ddd',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '8px 12px',
            fontSize: '12px'
          }}
        />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center"
          iconSize={10}
          iconType="circle"
          wrapperStyle={{ 
            fontSize: '12px', 
            paddingTop: '10px' 
          }}
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
  height = 300 // Increased default height for consistency
}) => {
  // Ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-[300px]">No data available</div>;
  }

  // If we have many data points, we need to adjust the margin
  const dynamicMargin = data.length > 5 
    ? { top: 20, right: 30, left: 20, bottom: 60 } 
    : { top: 20, right: 30, left: 20, bottom: 40 };

  // Generate gradient colors for bars
  const getBarColor = (index: number) => COLORS[index % COLORS.length];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={dynamicMargin}
        barSize={data.length > 6 ? 30 : 50}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis 
          dataKey={xKey} 
          fontSize={12}
          angle={-30}
          textAnchor="end"
          interval={0}
          height={60}
          tickMargin={10}
          tick={{ fill: '#555' }}
          axisLine={{ stroke: '#e0e0e0' }}
          tickLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis 
          fontSize={12}
          tick={{ fill: '#555' }}
          axisLine={{ stroke: '#e0e0e0' }}
          tickLine={{ stroke: '#e0e0e0' }}
        />
        <Tooltip 
          formatter={tooltipFormatter}
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid #ddd',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '8px 12px',
            fontSize: '12px'
          }}
        />
        <Bar 
          dataKey={yKey} 
          radius={[4, 4, 0, 0]} // Rounded corners on top
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(index)} />
          ))}
          <LabelList 
            dataKey={yKey} 
            position="top" 
            fontSize={12} 
            fontWeight="500"
            fill="#555"
          />
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