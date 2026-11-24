/**
 * TrendChart - BPM-over-time line chart for the private reading log.
 * Hand-rolled on react-native-svg (already a dependency; no chart library
 * added, per the books' minimal-dependency guidance). All math lives in the
 * pure, Node-tested scales module - this component only renders.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { computeDomain, linePath, movingAverage, scaleX, scaleY, summarize, toTrendPoints } from '../trends/scales';
const W = 320;
const H = 140;
const PAD = { left: 30, right: 10, top: 12, bottom: 22 };
export function TrendChart({ records }) {
    const model = useMemo(() => {
        const points = toTrendPoints(records);
        const domain = computeDomain(points.map((p) => p.v));
        const xs = points.map((p) => scaleX(p.t, PAD.left, W - PAD.right));
        const ys = points.map((p) => scaleY(p.v, domain, PAD.top, H - PAD.bottom));
        const smooth = movingAverage(points);
        const smoothYs = smooth.map((p) => scaleY(p.v, domain, PAD.top, H - PAD.bottom));
        return {
            domain,
            xs,
            ys,
            rawPath: linePath(xs, ys),
            smoothPath: linePath(xs, smoothYs),
            stats: summarize(points.map((p) => p.v)),
        };
    }, [records]);
    if (model.stats == null)
        return null;
    const gridValues = [model.domain.min, (model.domain.min + model.domain.max) / 2, model.domain.max];
    return (<View style={styles.wrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {gridValues.map((g, i) => {
            const y = scaleY(g, model.domain, PAD.top, H - PAD.bottom);
            return <Line key={i} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#38243b" strokeWidth={1} strokeDasharray="3,5"/>;
        })}
        <Path d={model.smoothPath} stroke="#7fe0bd" strokeWidth={2.5} fill="none"/>
        <Path d={model.rawPath} stroke="#f04c88" strokeWidth={1} fill="none" opacity={0.45}/>
        {model.xs.map((x, i) => (<Circle key={i} cx={x} cy={model.ys[i]} r={3} fill="#f04c88"/>))}
      </Svg>
      <View style={styles.axisRow}>
        {gridValues.map((g, i) => (<Text key={i} style={styles.axisText}>{Math.round(g)}</Text>))}
      </View>
      <View style={styles.statsRow}>
        <Stat label="avg" value={String(model.stats.avg)}/>
        <Stat label="low" value={String(model.stats.min)}/>
        <Stat label="high" value={String(model.stats.max)}/>
        <Stat label="readings" value={String(model.stats.count)}/>
      </View>
      <Text style={styles.legend}>green: smoothed trend - pink: individual readings</Text>
    </View>);
}
function Stat({ label, value }) {
    return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
const styles = StyleSheet.create({
    wrap: { backgroundColor: '#1b0e1d', borderWidth: 1, borderColor: '#38243b', borderRadius: 18, padding: 14, marginTop: 16 },
    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    axisText: { color: '#6d5e70', fontSize: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
    stat: { alignItems: 'center' },
    statValue: { color: '#fff9fc', fontSize: 18, fontWeight: '800' },
    statLabel: { color: '#8f8294', fontSize: 10, marginTop: 2 },
    legend: { color: '#6d5e70', fontSize: 10, textAlign: 'center', marginTop: 10 },
});
