import React from 'react';
import { getBranches, getBranch, getPush, getDelta, insertPush } from './api';
import Masterbar from './Masterbar';
import Select from './Select';
import Delta from './Delta';

const CommitMessage = ({ message }) => {
	const children = [];
	const re = /#(\d+)/g;
	let i = 0,
		match;
	while ((match = re.exec(message))) {
		children.push(
			message.substr(i, match.index - i),
			<a href={`https://github.com/Automattic/wp-calypso/pull/${match[1]}`}>{match[0]}</a>
		);
		i = match.index + match[0].length;
	}
	children.push(message.substr(i));

	return <span>{children}</span>;
};

const BranchCommit = ({ commit }) => {
	if (!commit) {
		return <div>...</div>;
	}

	return (
		<p className="push">
			<b>Commit:</b> {commit.sha}
			<br />
			<b>Author:</b> {commit.author}
			<br />
			<b>At:</b> {commit.created_at}
			<br />
			<b>Message:</b> <CommitMessage message={commit.message} />
		</p>
	);
};

class BranchPushSubmit extends React.Component {
	handleSubmit = () =>
		insertPush({
			...this.props.commit,
			branch: this.props.branch,
		});

	render() {
		return (
			<p>
				We don't have stats for this push.
				<button className="button" onClick={this.handleSubmit}>
					Build Them!
				</button>
			</p>
		);
	}
}

class BranchView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(props.location.search);
		const selectedBranch = searchParams.get('branch') || '';

		this.state = {
			selectedBranch,
			branchList: null,
			selectedBranchHead: null,
			selectedBranchPush: null,
			selectedBranchDelta: null,
		};
	}

	componentDidMount() {
		this.loadBranches();
		if (this.state.selectedBranch) {
			this.loadBranchHead(this.state.selectedBranch);
		}
	}

	loadBranches() {
		getBranches().then(branches => {
			const branchList = [
				{ value: '', name: '-- select branch --' },
				...branches.filter(branch => branch !== 'master'),
			];
			this.setState({ branchList });
		});
	}

	async loadBranchHead(branchName) {
		const branchResponse = await getBranch(branchName);
		const { sha, author, commit } = branchResponse.commit;
		const head = {
			sha,
			author: author.login,
			message: commit.message.split('\n')[0],
			created_at: commit.committer.date,
		};

		this.setState({
			selectedBranchHead: head,
			selectedBranchPush: 'loading',
		});

		const pushResponse = await getPush(sha);
		const { push } = pushResponse.data;

		this.setState({ selectedBranchPush: push });

		if (!push || !push.ancestor) {
			return;
		}

		const deltaResponse = await getDelta(push.ancestor, push.sha);
		this.setState({ selectedBranchDelta: deltaResponse.data.delta });
	}

	selectBranch = event => {
		const selectedBranch = event.target.value;
		this.props.history.push({ search: `?branch=${selectedBranch}` });
		this.setState({
			selectedBranch,
			selectedBranchHead: null,
			selectedBranchPush: null,
			selectedBranchDelta: null,
		});
		this.loadBranchHead(selectedBranch);
	};

	renderBranchCommit() {
		const { selectedBranch, selectedBranchHead } = this.state;

		if (!selectedBranch) {
			return null;
		}

		return <BranchCommit commit={selectedBranchHead} />;
	}

	renderBranchPushInfo() {
		const {
			selectedBranch,
			selectedBranchHead,
			selectedBranchPush,
			selectedBranchDelta,
		} = this.state;

		if (!selectedBranchHead) {
			return null;
		}

		if (selectedBranchPush === 'loading') {
			return <p>...</p>;
		}
		if (!selectedBranchPush) {
			return <BranchPushSubmit branch={selectedBranch} commit={selectedBranchHead} />;
		}

		if (!selectedBranchPush.processed || !selectedBranchPush.ancestor) {
			return <p>Building...</p>;
		}

		return <Delta delta={selectedBranchDelta} />;
	}

	render() {
		const { branchList, selectedBranch } = this.state;

		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					<p>
						<label>Showing stats for branch:</label>
						<Select value={selectedBranch} onChange={this.selectBranch} options={branchList} />
					</p>
					{this.renderBranchCommit()}
					{this.renderBranchPushInfo()}
				</div>
			</div>
		);
	}
}

export default BranchView;
