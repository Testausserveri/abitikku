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

import { scanner } from '@testausserveri/abitikku-sdk';
import * as React from 'react';
import { Flex, Txt } from 'rendition';

import {
	DriveSelector,
	DriveSelectorProps,
} from '../drive-selector/drive-selector';
import {
	isDriveSelected,
	getImage,
	getSelectedDrives,
	deselectDrive,
	selectDrive,
} from '../../models/selection-state';
import { observe } from '../../models/store';
import * as analytics from '../../modules/analytics';
import { TargetSelectorButton } from './target-selector-button';

import TgtSvg from '../../../assets/tgt.svg';
import { warning } from '../../../../shared/messages';
import { useTranslation } from 'react-i18next';

export const getDriveListLabel = () => {
	return getSelectedDrives()
		.map((drive: any) => {
			return `${drive.description} (${drive.displayName})`;
		})
		.join('\n');
};

const getDriveSelectionStateSlice = () => ({
	driveListLabel: getDriveListLabel(),
	targets: getSelectedDrives(),
	image: getImage(),
});

export const TargetSelectorModal = (
	props: Omit<
		DriveSelectorProps,
		| 'titleLabel'
		| 'emptyListLabel'
		| 'multipleSelection'
		| 'emptyListIcon'
		| 't'
		| 'i18n'
		| 'tReady'
	>,
) => {
	const { t } = useTranslation();

	return (
		<DriveSelector
			multipleSelection={true}
			titleLabel={t('gui.target-selector.title')}
			emptyListLabel={t('gui.target-selector.emptyListLabel')}
			emptyListIcon={<TgtSvg width="40px" />}
			showWarnings={true}
			selectedList={getSelectedDrives()}
			updateSelectedList={getSelectedDrives}
			{...props}
		/>
	);
};

export const selectAllTargets = (
	modalTargets: scanner.adapters.DrivelistDrive[],
) => {
	const selectedDrivesFromState = getSelectedDrives();
	const deselected = selectedDrivesFromState.filter(
		(drive) =>
			!modalTargets.find((modalTarget) => modalTarget.device === drive.device),
	);
	// deselect drives
	deselected.forEach((drive) => {
		analytics.logEvent('Toggle drive', {
			drive,
			previouslySelected: true,
		});
		deselectDrive(drive.device);
	});
	// select drives
	modalTargets.forEach((drive) => {
		// Don't send events for drives that were already selected
		if (!isDriveSelected(drive.device)) {
			analytics.logEvent('Toggle drive', {
				drive,
				previouslySelected: false,
			});
		}
		selectDrive(drive.device);
	});
};

interface TargetSelectorProps {
	disabled: boolean;
	hasDrive: boolean;
	flashing: boolean;
}

export const TargetSelector = ({
	disabled,
	hasDrive,
	flashing,
}: TargetSelectorProps) => {
	// TODO: inject these from redux-connector
	const [{ driveListLabel, targets }, setStateSlice] = React.useState(
		getDriveSelectionStateSlice(),
	);
	const [showTargetSelectorModal, setShowTargetSelectorModal] =
		React.useState(false);
	const { t } = useTranslation();

	React.useEffect(() => {
		return observe(() => {
			setStateSlice(getDriveSelectionStateSlice());
		});
	}, []);

	const hasSystemDrives = targets.some((target) => target.isSystem);
	return (
		<Flex
			flexDirection="column"
			alignItems="start"
			style={{ marginRight: '1rem' }}
		>
			{hasSystemDrives ? (
				<Txt
					color="#e08704"
					style={{
						position: 'absolute',
						bottom: '25px',
					}}
				>
					{t('gui.version-selector.betaWarning', {
						betaWarning: warning.systemDrive(),
					})}
				</Txt>
			) : null}
			<TargetSelectorButton
				disabled={disabled}
				show={!hasDrive}
				tooltip={driveListLabel}
				openDriveSelector={() => {
					setShowTargetSelectorModal(true);
				}}
				reselectDrive={() => {
					analytics.logEvent('Reselect drive');
					setShowTargetSelectorModal(true);
				}}
				flashing={flashing}
				targets={targets}
			/>

			{showTargetSelectorModal && (
				<TargetSelectorModal
					write={true}
					cancel={() => setShowTargetSelectorModal(false)}
					done={(modalTargets) => {
						selectAllTargets(modalTargets);
						setShowTargetSelectorModal(false);
					}}
				/>
			)}
		</Flex>
	);
};
