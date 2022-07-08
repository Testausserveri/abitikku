/*
 * Copyright 2016 balena.io
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

import * as React from 'react';
import { Flex, Button, ProgressBar, Txt, Badge } from 'rendition';
import { default as styled } from 'styled-components';

import { fromFlashState } from '../../modules/progress-status';
import {
	ChangeButton,
	DetailsTextWhite,
	StepButton,
} from '../../styled-components';
import * as selectionState from '../../models/selection-state';
import { SourceMetadata } from '../source-selector/source-selector';
import { DrivelistDrive } from '../../../../shared/drive-constraints';
import { SVGIcon } from '../svg-icon/svg-icon';
import ImageSvg from '../../../assets/image.svg';
import * as prettyBytes from 'pretty-bytes';
import * as _ from 'lodash';
import { withTranslation, WithTranslation } from 'react-i18next';
import { t } from 'i18next';
import i18n from '../../../../shared/i18n';

const FlashProgressBar = styled(ProgressBar)`
	> div {
		width: 100%;
		height: 12px;
		color: white !important;
		text-shadow: none !important;
		transition-duration: 0s;
		> div {
			transition-duration: 0s;
		}
	}

	width: 100%;
	height: 12px;
	margin-bottom: 6px;
	border-radius: 14px;
	font-size: 16px;
	line-height: 48px;

	background: #2f3033;
`;

interface ProgressButtonProps extends WithTranslation {
	type: 'decompressing' | 'flashing' | 'verifying';
	active: boolean;
	percentage: number;
	position: number;
	disabled: boolean;
	cancel: (type: string) => void;
	callback: () => void;
	versionCallback: () => void;
	warning?: boolean;
}

const colors = {
	decompressing: '#0063bd',
	flashing: '#da60ff',
	verifying: '#1ac135',
} as const;

const CancelButton = styled(({ type, onClick, ...props }) => {
	const status =
		type === 'verifying'
			? i18n.t('common.action.skip')
			: i18n.t('common.action.cancel');
	return (
		<Button plain onClick={() => onClick(type === 'verifying' ? 'skip' : 'cancel')} {...props}>
			{status}
		</Button>
	);
})`
	font-weight: 600;
	&&& {
		width: auto;
		height: auto;
		font-size: 14px;
	}
`;

class WrapProgressButton extends React.PureComponent<ProgressButtonProps> {
	public render() {
		const percentage = this.props.percentage;
		const warning = this.props.warning;
		const { status, position } = fromFlashState({
			type: this.props.type,
			percentage,
			position: this.props.position,
		});
		const type = this.props.type || 'default';
		if (this.props.active) {
			return (
				<>
					<Flex
						alignItems="baseline"
						justifyContent="space-between"
						width="220px"
						style={{
							marginTop: 42,
							marginBottom: '6px',
							fontSize: 16,
							fontWeight: 600,
						}}
					>
						<Flex>
							<Txt color="#121212">{status}&nbsp;</Txt>
							<Txt color={colors[type]}>{position}</Txt>
						</Flex>
						{type && (
							<CancelButton
								type={type}
								onClick={this.props.cancel}
								color="#0063bd"
							/>
						)}
					</Flex>
					<FlashProgressBar background={colors[type]} value={percentage} />
				</>
			);
		}
		const selectionImage = selectionState.getImage();
		let image: SourceMetadata | DrivelistDrive =
			selectionImage !== undefined ? selectionImage : ({} as SourceMetadata);
		const betaVersion = image.versionInfo?.beta || false;

		image = image.drive ?? image;

		image.name = image.description || image.name;
		const imageLogo = image.logo || '';
		const imageName =
			image.name || this.props.t('gui.progress-button.fallbackImageName');
		const imageSize = image.size;

		return (
			<>
				<Flex
					flexDirection="row"
					style={{
						justifyContent: 'center',
						alignContent: 'center',
						justifyItems: 'center',
						alignItems: 'center',
					}}
					minHeight={48}
					width={'100%'}
				>
					<Flex flexDirection={'row'} style={{ flex: 1 }}>
						<SVGIcon contents={imageLogo} fallback={ImageSvg} />
						<Flex
							flexDirection="column"
							style={{ marginLeft: '9px', color: '#fff' }}
						>
							<DetailsTextWhite>
								{imageName}{' '}
								{betaVersion && (
									<Badge
										key={'BETA'}
										shade={5}
										ml="5px"
										tooltip={t('gui.progress-button.betaVersion')}
									>
										BETA
									</Badge>
								)}
							</DetailsTextWhite>
							{!_.isNil(imageSize) && (
								<DetailsTextWhite>
									{prettyBytes(imageSize).replace(/GB/, 'Gt')}
								</DetailsTextWhite>
							)}
						</Flex>
					</Flex>
					<div>
						<ChangeButton
							plain
							style={{ width: 'unset', padding: '7px' }}
							onClick={this.props.versionCallback}
						>
							{this.props.t('gui.progress-button.changeVersion')}
						</ChangeButton>
					</div>
				</Flex>
				<StepButton
					primary={!warning}
					warning={warning}
					onClick={this.props.callback}
					disabled={this.props.disabled}
					style={{
						marginTop: 30,
						width: '100%',
					}}
				>
					{this.props.t('gui.progress-button.flash')}
				</StepButton>
				{/*<Flex flexDirection={"row"} justifyContent={"center"} alignItems={"center"} m={2}>
					<ExclamationTriangleSvg
						height="1em"
						fill={'#e08704'}
						style={{margin: 3}}
						/>
					<Txt>Asennus alustaa tikulta/tikuilta kaikki sisällöt pysyvästi!</Txt>
				</Flex>*/}
			</>
		);
	}
}

export const ProgressButton = withTranslation()(WrapProgressButton);
