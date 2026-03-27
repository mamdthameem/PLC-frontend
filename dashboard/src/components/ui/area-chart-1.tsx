import React from 'react';
import {
  AreaChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  AreaSeries,
  Area,
  Gradient,
  GradientStop,
  GridlineSeries,
  Gridline,
} from 'reaviz';

interface ChartDataPoint {
  key: Date;
  data: number | null | undefined; 
}

interface ChartSeries {
  key: string;
  data: ChartDataPoint[];
}

const validateChartData = (data: ChartSeries[]): ChartSeries[] => {
  return data.map(series => ({
    ...series,
    data: series.data.map(item => ({
      ...item,
      data: (typeof item.data !== 'number' || isNaN(item.data)) ? 0 : item.data,
    })),
  }));
};

interface AreaChartComponentProps {
  data: ChartSeries[];
  height?: number;
  colorScheme?: string[];
  showLegend?: boolean;
}

export const AreaChartComponent: React.FC<AreaChartComponentProps> = ({
  data,
  height = 200,
  colorScheme = ['#3b82f6'],
  showLegend = false,
}) => {
  const validatedChartData = validateChartData(data);

  return (
    <>
      <style jsx global>{`
        :root {
          --reaviz-tick-fill: #9A9AAF;
          --reaviz-gridline-stroke: #7E7E8F75;
        }
        .dark {
          --reaviz-tick-fill: rgba(255, 255, 255, 0.6);
          --reaviz-gridline-stroke: rgba(255, 255, 255, 0.1);
        }
        /* Make data points visible */
        .reaviz-chart-container svg path[stroke] {
          stroke-width: 3 !important;
        }
        .reaviz-chart-container svg circle {
          r: 5 !important;
          fill: #ffffff !important;
          stroke-width: 2.5 !important;
          opacity: 1 !important;
        }
      `}</style>
      <div className="reaviz-chart-container" style={{ height }}>
        <AreaChart
          height={height}
          id="parameter-area-chart"
          data={validatedChartData}
          xAxis={
            <LinearXAxis
              type="time"
              tickSeries={
                <LinearXAxisTickSeries
                  label={
                    <LinearXAxisTickLabel
                      format={(v) => {
                        const date = new Date(v);
                        // Show only hour:minute for cleaner labels (fewer labels = clearer view)
                        return date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true
                        });
                      }}
                      fill="var(--reaviz-tick-fill)"
                    />
                  }
                  tickSize={8}
                />
              }
            />
          }
          yAxis={
            <LinearYAxis
              axisLine={null}
              tickSeries={
                <LinearYAxisTickSeries 
                  line={null}
                  label={
                    <LinearXAxisTickLabel 
                      fill="var(--reaviz-tick-fill)"
                      format={(v) => {
                        // Format numbers for cleaner display
                        const num = typeof v === 'number' ? v : parseFloat(String(v));
                        if (num >= 1000) {
                          return (num / 1000).toFixed(1) + 'k';
                        }
                        if (num >= 1) {
                          return num.toFixed(0);
                        }
                        return num.toFixed(2);
                      }}
                    />
                  } 
                  tickSize={8}
                />
              } 
            />
          }
          series={
            <AreaSeries
              type="grouped"
              interpolation="smooth"
              area={
                <Area
                  gradient={
                    <Gradient
                      stops={[
                        <GradientStop key={1} stopOpacity={0} />,
                        <GradientStop key={2} offset="100%" stopOpacity={0.25} />,
                      ]}
                    />
                  }
                />
              }
              colorScheme={colorScheme}
            />
          }
          gridlines={<GridlineSeries line={<Gridline strokeColor="var(--reaviz-gridline-stroke)" />} />}
        />
      </div>
    </>
  );
};
