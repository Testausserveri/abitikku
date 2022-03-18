/*
 * Copyright 2019 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// import InfoSvg from '@fortawesome/fontawesome-free/svgs/solid/info.svg';

import * as path from 'path';
import * as prettyBytes from 'pretty-bytes';
import * as React from 'react';
import { Flex } from 'rendition';
// import styled from 'styled-components';

import FinishPage from '../../components/finish/finish';
import { ReducedFlashingInfos } from '../../components/reduced-flashing-infos/reduced-flashing-infos';
import { SettingsModal } from '../../components/settings/settings';
import { SourceMetadata } from '../../components/source-selector/source-selector';
import * as flashState from '../../models/flash-state';
import * as selectionState from '../../models/selection-state';
import * as settings from '../../models/settings';
import { observe } from '../../models/store';
import { open as openExternal } from '../../os/open-external/services/open-external';
import {
	// IconButton as BaseIcon,
	ThemedProvider,
} from '../../styled-components';

import {
	TargetSelector,
	getDriveListLabel,
} from '../../components/target-selector/target-selector';
import { FlashStep } from './Flash';

import AbiTikkuSvg from '../../../assets/abitikku.svg';
import { SafeWebview } from '../../components/safe-webview/safe-webview';
import { sourceDestination } from '@testausserveri/abitikku-sdk';
import * as messages from '../../../../shared/messages';
import * as supportedFormats from '../../../../shared/supported-formats';
import * as analytics from '../../modules/analytics';
import { replaceWindowsNetworkDriveLetter } from '../../os/windows-network-drives';
import * as errors from '../../../../shared/errors';
import * as osDialog from '../../os/dialog';
import { Http } from '@testausserveri/abitikku-sdk/build/source-destination';
import { Version } from '../../models/version';
import ConfigIcon from '@fortawesome/fontawesome-free/svgs/solid/cog.svg';
import { IconButton as BaseIcon } from '../../styled-components';
import styled from 'styled-components';
import i18n from '../../../../shared/i18n';
import { LanguageSelector } from '../../components/language-selector/language-selector';

export type Source =
	| typeof sourceDestination.File
	| typeof sourceDestination.BlockDevice
	| typeof sourceDestination.Http;

const abittiDownloadUrl = 'https://static.abitti.fi/etcher-usb/koe-etcher.zip';

/*const Icon = styled(BaseIcon)`
	margin-right: 20px;
`;*/

const isURL = (imagePath: string) =>
	imagePath.startsWith('https://') || imagePath.startsWith('http://');

function getDrivesTitle() {
	const drives = selectionState.getSelectedDrives();

	if (drives.length === 1) {
		return (
			drives[0].description || i18n.t('gui.mainPage.driveTitle.noDescription')
		);
	}

	if (drives.length === 0) {
		return i18n.t('gui.mainPage.driveTitle.noTargets');
	}

	return i18n.t('gui.mainPage.targets', { count: drives.length });
}

function getImageBasename(image?: SourceMetadata) {
	if (image === undefined) {
		return '';
	}

	if (image.drive) {
		return image.drive.description;
	}
	const imageBasename = path.basename(image.path);
	return image.name || imageBasename;
}

const Icon = styled(BaseIcon)`
	margin-right: 20px;
	margin-left: 7px;
`;

/*
const UpdateBanner = styled(Badge)`
	margin: 0;
`;*/

interface MainPageStateFromStore {
	isFlashing: boolean;
	hasImage: boolean;
	hasDrive: boolean;
	imageLogo?: string;
	imageSize?: number;
	imageName?: string;
	driveTitle: string;
	driveLabel: string;
}

interface MainPageState {
	current: 'main' | 'success';
	isWebviewShowing: boolean;
	hideSettings: boolean;
	featuredProjectURL?: string;
}

export class MainPage extends React.Component<
	{},
	MainPageState & MainPageStateFromStore
> {
	constructor(props: {}) {
		super(props);
		this.state = {
			current: 'main',
			isWebviewShowing: false,
			hideSettings: true,
			...this.stateHelper(),
		};
	}

	private stateHelper(): MainPageStateFromStore {
		const image = selectionState.getImage();
		return {
			isFlashing: flashState.isFlashing(),
			hasImage: selectionState.hasImage(),
			hasDrive: selectionState.hasDrive(),
			imageLogo: image?.logo,
			imageSize: image?.size,
			imageName: getImageBasename(selectionState.getImage()),
			driveTitle: getDrivesTitle(),
			driveLabel: getDriveListLabel(),
		};
	}

	private async getFeaturedProjectURL() {
		const url = new URL(
			(await settings.get('featuredProjectEndpoint')) ||
				'https://abitikku.testausserveri.fi/featured/',
		);
		url.searchParams.append('borderRight', 'false');
		url.searchParams.append('darkBackground', 'true');
		return url.toString();
	}

	private async createSource(selected: string, SourceType: Source) {
		try {
			selected = await replaceWindowsNetworkDriveLetter(selected);
		} catch (error) {
			analytics.logException(error);
		}

		if (SourceType === sourceDestination.File) {
			return new sourceDestination.File({
				path: selected,
			});
		}
		return new sourceDestination.Http({
			url: selected,
			useCache: await settings.get('useCache'),
		});
	}

	private handleError(
		title: string,
		sourcePath: string,
		description: string,
		error?: Error,
	) {
		const imageError = errors.createUserError({
			title,
			description,
		});
		osDialog.showError(imageError);
		if (error) {
			analytics.logException(error);
			return;
		}
		analytics.logEvent(title, { path: sourcePath });
	}

	private async getMetadata(
		source: sourceDestination.SourceDestination,
		selected: string,
		versionInfo?: Version,
	) {
		const metadata = (await source.getMetadata()) as SourceMetadata;
		const partitionTable = await source.getPartitionTable();
		if (partitionTable) {
			metadata.hasMBR = true;
			metadata.partitions = partitionTable.partitions;
		} else {
			metadata.hasMBR = false;
		}
		metadata.extension = path.extname(selected).slice(1);
		metadata.path = selected;
		metadata.versionInfo = versionInfo;
		return metadata;
	}

	public async setSourceImage(
		selected: string,
		SourceType: Source,
		versionInfo?: Version,
	) {
		selectionState.deselectImage();
		const sourcePath = selected;
		let source;
		let metadata: SourceMetadata | undefined;

		if (SourceType === sourceDestination.Http && !isURL(selected)) {
			this.handleError(
				'Unsupported protocol',
				selected,
				messages.error.unsupportedProtocol(),
			);
			return;
		}

		if (supportedFormats.looksLikeWindowsImage(selected)) {
			analytics.logEvent('Possibly Windows image', { image: selected });
		}
		source = await this.createSource(selected, SourceType);

		try {
			const innerSource = await source.getInnerSource();
			metadata = await this.getMetadata(innerSource, selected, versionInfo);
			metadata.SourceType = SourceType;

			if (!metadata.hasMBR) {
				analytics.logEvent('Missing partition table', { metadata });
			}
		} catch (error) {
			this.handleError(
				'Error opening source',
				sourcePath,
				messages.error.openSource(sourcePath, error.message),
				error,
			);
		} finally {
			try {
				await source.close();
			} catch (error) {
				// Noop
			}
			if (metadata !== undefined) {
				selectionState.selectSource(metadata);
			}
		}
	}

	public async componentDidMount() {
		observe(() => {
			this.setState(this.stateHelper());
		});
		this.setState({ featuredProjectURL: await this.getFeaturedProjectURL() });
		await this.setSourceImage(abittiDownloadUrl, sourceDestination.Http);
	}

	private renderMain() {
		const state = flashState.getFlashState();
		const shouldDriveStepBeDisabled = !this.state.hasImage;
		const shouldFlashStepBeDisabled =
			!this.state.hasImage || !this.state.hasDrive;
		const notFlashingOrSplitView =
			!this.state.isFlashing || !this.state.isWebviewShowing;
		return (
			<Flex
				m={`${this.state.isWebviewShowing ? 35 : 55}px`}
				mt="0"
				justifyContent="space-between"
			>
				{notFlashingOrSplitView && (
					<>
						<TargetSelector
							disabled={shouldDriveStepBeDisabled}
							hasDrive={this.state.hasDrive}
							flashing={this.state.isFlashing}
						/>
					</>
				)}

				{this.state.isFlashing && this.state.isWebviewShowing && (
					<Flex
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '36.2vw',
							height: '100vh',
							zIndex: 1,
							boxShadow: '0 2px 15px 0 rgba(0, 0, 0, 0.2)',
						}}
					>
						<ReducedFlashingInfos
							imageLogo={this.state.imageLogo}
							imageName={this.state.imageName}
							imageSize={
								typeof this.state.imageSize === 'number'
									? prettyBytes(this.state.imageSize)
									: ''
							}
							driveTitle={this.state.driveTitle}
							driveLabel={this.state.driveLabel}
							style={{
								position: 'absolute',
								color: '#000',
								left: 35,
								top: 72,
							}}
						/>
					</Flex>
				)}
				{this.state.isFlashing && this.state.featuredProjectURL && (
					<SafeWebview
						src={this.state.featuredProjectURL}
						onWebviewShow={(isWebviewShowing: boolean) => {
							this.setState({ isWebviewShowing });
						}}
						style={{
							position: 'absolute',
							right: 0,
							bottom: 0,
							width: '63.8vw',
							height: '100vh',
						}}
					/>
				)}

				<FlashStep
					width={this.state.isWebviewShowing ? '220px' : '200px'}
					goToSuccess={() => this.setState({ current: 'success' })}
					shouldFlashStepBeDisabled={shouldFlashStepBeDisabled}
					versionChange={(version) =>
						this.setSourceImage(version.url, Http, version)
					}
					isFlashing={this.state.isFlashing}
					step={state.type}
					percentage={state.percentage}
					position={state.position}
					failed={state.failed}
					speed={state.speed}
					eta={state.eta}
					style={this.state.isFlashing ? { zIndex: 1 } : { zIndex: 1, flex: 1 }}
				/>
			</Flex>
		);
	}

	private renderSuccess() {
		return (
			<FinishPage
				goToMain={() => {
					flashState.resetState();
					this.setState({ current: 'main' });
				}}
			/>
		);
	}
	public render() {
		return (
			<ThemedProvider
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					position: 'fixed',
				}}
			>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					style={{
						// Allow window to be dragged from header
						// @ts-ignore
						'-webkit-app-region': 'drag',
						position: 'relative',
						zIndex: 2,
						flex: this.state.isFlashing ? 0 : 1,
					}}
				>
					{!this.state.isFlashing && (
						<Flex
							width="100%"
							alignItems={'center'}
							justifyContent="center"
							flexDirection={'column'}
						>
							<AbiTikkuSvg
								viewBox="0 0 434.412 81.378"
								width="200"
								style={{
									cursor: 'pointer',
								}}
								onClick={() =>
									openExternal('https://abitikku.testausserveri.fi')
								}
								tabIndex={100}
							/>
						</Flex>
					)}
					{
						<div
							style={{
								position: 'absolute',
								right: 0,
								top: 0,
								marginTop: '20px',
								display: 'flex',
							}}
						>
							<LanguageSelector />
							<Icon
								icon={<ConfigIcon height="1em" fill="#222" />}
								plain
								tabIndex={5}
								onClick={() => this.setState({ hideSettings: false })}
								style={{
									// Make touch events click instead of dragging
									'-webkit-app-region': 'no-drag',
								}}
							/>
						</div>
					}
				</Flex>
				{this.state.hideSettings ? null : (
					<SettingsModal
						toggleModal={(value: boolean) => {
							this.setState({ hideSettings: !value });
						}}
					/>
				)}
				{this.state.current === 'main'
					? this.renderMain()
					: this.renderSuccess()}
			</ThemedProvider>
		);
	}
}

export default MainPage;
