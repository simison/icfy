import React from 'react';
import { Link } from 'react-router-dom';

import { getChartData, getChunkList } from './api';
import Masterbar from './Masterbar';
import Chart from './Chart';
import PushDetails from './PushDetails';
import Select from './Select';

const SIZES = ['stat_size', 'parsed_size', 'gzip_size'];
const PERIODS = [
	{ value: 'last200', name: 'last 200 pushes' },
	{ value: 'last400', name: 'last 400 pushes' },
	{ value: 'last800', name:'last 800 pushes' },
	{ value: 'last1600', name:'last 1600 pushes' }
];

class CheckList extends React.Component {
	static defaultProps = {
		value: [],
	};

	handleChange = event => {
		const { value, onChange } = this.props;
		const { name, checked } = event.target;
		if (checked) {
			onChange([...value, name]);
		} else {
			onChange(value.filter(v => v !== name));
		}
	};

	render() {
		const { value, options } = this.props;

		if (!options) {
			return null;
		}

		return (
			<div className="checklist">
				{options.map(opt => (
					<div key={opt} className="checklist__item">
						<input
							type="checkbox"
							id={opt}
							name={opt}
							checked={value.includes(opt)}
							onChange={this.handleChange}
						/>
						<label htmlFor={opt}>{opt}</label>
					</div>
				))}
			</div>
		);
	}
}

class ChartView extends React.Component {
	state = {
		chunks: null,
		selectedChunks: ['build'],
		selectedSize: 'gzip_size',
		selectedPeriod: 'last200',
		data: null,
		chartData: null,
		currentPushSha: null,
		currentPrevPushSha: null,
	};

	componentDidMount() {
		this.loadChunks();
		this.loadChart();
	}

	changeChunks = chunks => this.setChunks(chunks);
	changeSize = event => this.setSize(event.target.value);
	changePeriod = event => this.setPeriod(event.target.value);

	showPush = pushIndex => {
		const pushToLoad = this.state.data[0].data[pushIndex];
		const prevPush = pushIndex > 0 ? this.state.data[0].data[pushIndex - 1] : null;

		this.setState({
			currentPushSha: pushToLoad.sha,
			currentPrevPushSha: prevPush ? prevPush.sha : null,
		});
	};

	loadChunks() {
		getChunkList().then(response => {
			const { chunks } = response.data;
			this.setState({ chunks });
		});
	}

	loadChart() {
		Promise.all(
			this.state.selectedChunks.map(chunk =>
				getChartData(chunk, this.state.selectedPeriod).then(response => ({
					chunk,
					data: response.data.data,
				}))
			)
		).then(data => this.setData(data));
	}

	setChunks(selectedChunks) {
		if (selectedChunks.length === 0) {
			selectedChunks = ['build'];
		}
		this.setState({ selectedChunks }, () => this.loadChart());
	}

	setPeriod(selectedPeriod) {
		this.setState({ selectedPeriod }, () => this.loadChart());
	}

	setSize(selectedSize) {
		const { data } = this.state;
		this.setState({
			selectedSize,
			chartData: data.map(chunkData => [
				chunkData.chunk,
				...chunkData.data.map(d => d[selectedSize]),
			]),
		});
	}

	setData(data) {
		const { selectedSize } = this.state;
		this.setState({
			data,
			chartData: data.map(chunkData => [
				chunkData.chunk,
				...chunkData.data.map(d => d[selectedSize]),
			]),
		});
	}

	render() {
		return (
			<div className="layout">
				<Masterbar />
				<div className="sidebar">
					<div>Select the chunks to display:</div>
					<CheckList
						value={this.state.selectedChunks}
						onChange={this.changeChunks}
						options={this.state.chunks}
					/>
				</div>
				<div className="content has-sidebar">
					<p>
						Select the size type you're interested in:
						<Select value={this.state.selectedSize} onChange={this.changeSize} options={SIZES} />
					</p>
					<p>
						Showing
						<Select value={this.state.selectedPeriod} onChange={this.changePeriod} options={PERIODS}/>
						in <b>master</b> (choose <Link to="/branch">another branch</Link>)
					</p>
					{this.state.chartData && (
						<Chart chartData={this.state.chartData} onMouseOver={this.showPush} />
					)}
					<PushDetails
						sha={this.state.currentPushSha}
						prevSha={this.state.currentPrevPushSha}
						debounceDelay={500}
					/>
				</div>
			</div>
		);
	}
}

export default ChartView;
